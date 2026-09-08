import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KPI_TO_LINE, INPUT_KEYS, LINE_BY_KEY, planYears } from "@/lib/budgetPlanner/categories";
import {
  DEFAULT_SETTINGS,
  YearSettings,
  ValueMap,
  zeros,
  computeYear,
  projectInputs,
  ComputedYear,
} from "@/lib/budgetPlanner/engine";

type CellKey = string; // `${year}:${month}:${lineKey}`

const ck = (year: number, month: number, key: string): CellKey => `${year}:${month}:${key}`;

export interface BudgetPlannerData {
  loading: boolean;
  years: ReturnType<typeof planYears>;
  labels: Record<string, string>;
  setLabel: (key: string, label: string) => void;
  settings: Record<number, YearSettings>;
  setSetting: (year: number, patch: Partial<YearSettings>) => void;
  /** raw user-entered override for a cell, "" if none */
  cellRaw: (year: number, month: number, key: string) => string;
  setCell: (year: number, month: number, key: string, raw: string) => void;
  /** adjustment % (as decimal) for a projected year line */
  adjustment: (year: number, key: string) => number;
  computed: Record<number, ComputedYear>;
  kpiActuals: Record<string, number>; // `${year}:${month}:${lineKey}`
  saving: boolean;
}

export function useBudgetPlanner(locationId: string | null): BudgetPlannerData {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => planYears(currentYear), [currentYear]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [cells, setCells] = useState<Record<CellKey, string>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Record<number, YearSettings>>({});
  const [kpiActuals, setKpiActuals] = useState<Record<string, number>>({});

  const pending = useRef<Map<CellKey, number | null>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!uid) {
        setLoading(false);
        return;
      }
      setUserId(uid);

      let cellsQ = supabase.from("budget_cells").select("year,month,category_key,value").eq("user_id", uid);
      let settingsQ = supabase.from("budget_year_settings").select("*").eq("user_id", uid);
      let catsQ = supabase.from("budget_categories").select("category_key,label").eq("user_id", uid);
      let kpiQ = supabase.from("kpi_entries").select("year,month,field_name,field_value").eq("user_id", uid);
      if (locationId) {
        cellsQ = cellsQ.eq("location_id", locationId);
        settingsQ = settingsQ.eq("location_id", locationId);
        catsQ = catsQ.eq("location_id", locationId);
        kpiQ = kpiQ.eq("location_id", locationId);
      } else {
        cellsQ = cellsQ.is("location_id", null);
        settingsQ = settingsQ.is("location_id", null);
        catsQ = catsQ.is("location_id", null);
      }

      const [cellsRes, settingsRes, catsRes, kpiRes] = (await Promise.all([
        cellsQ,
        settingsQ,
        catsQ,
        kpiQ,
      ])) as unknown as Array<{ data: Record<string, unknown>[] | null }>;

      if (cancelled) return;

      const nextCells: Record<CellKey, string> = {};
      (cellsRes.data ?? []).forEach((r) => {
        nextCells[ck(Number(r.year), Number(r.month), String(r.category_key))] =
          r.value === null || r.value === undefined ? "" : String(r.value);
      });

      const nextSettings: Record<number, YearSettings> = {};
      (settingsRes.data ?? []).forEach((r) => {
        nextSettings[Number(r.year)] = {
          fica_rate: Number(r.fica_rate ?? DEFAULT_SETTINGS.fica_rate),
          futa_suta_rate: Number(r.futa_suta_rate ?? DEFAULT_SETTINGS.futa_suta_rate),
          state_tax_rate: Number(r.tax_rate_state ?? DEFAULT_SETTINGS.state_tax_rate),
          county_tax_rate: Number(r.tax_rate_county ?? DEFAULT_SETTINGS.county_tax_rate),
          city_tax_rate: Number(r.tax_rate_city ?? DEFAULT_SETTINGS.city_tax_rate),
          beginning_inventory: Number(r.beginning_inventory ?? 0),
          beginning_cash: Number(r.starting_cash ?? 0),
        };
      });

      const nextLabels: Record<string, string> = {};
      (catsRes.data ?? []).forEach((r) => {
        nextLabels[String(r.category_key)] = String(r.label);
      });

      const nextKpi: Record<string, number> = {};
      (kpiRes.data ?? []).forEach((r) => {
        const line = KPI_TO_LINE[String(r.field_name)];
        if (!line) return;
        const raw = String(r.field_value ?? "").replace(/[$,]/g, "");
        const num = parseFloat(raw);
        if (Number.isNaN(num)) return;
        const key = ck(Number(r.year), Number(r.month), line);
        nextKpi[key] = (nextKpi[key] ?? 0) + num;
      });

      setCells(nextCells);
      setSettings(nextSettings);
      setLabels(nextLabels);
      setKpiActuals(nextKpi);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const flush = useCallback(async () => {
    if (!userId || pending.current.size === 0) return;
    const rows = Array.from(pending.current.entries()).map(([key, value]) => {
      const [year, month, category_key] = key.split(":");
      return {
        user_id: userId,
        location_id: locationId,
        year: Number(year),
        month: Number(month),
        category_key,
        value,
      };
    });
    pending.current.clear();
    setSaving(true);
    await supabase.from("budget_cells").upsert(rows, {
      onConflict: "user_id,location_id,year,month,category_key",
    });
    setSaving(false);
  }, [userId, locationId]);

  const queue = useCallback(
    (key: CellKey, value: number | null) => {
      pending.current.set(key, value);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        flush();
      }, 800);
    },
    [flush],
  );

  const setCell = useCallback(
    (year: number, month: number, key: string, raw: string) => {
      const k = ck(year, month, key);
      setCells((prev) => ({ ...prev, [k]: raw }));
      const cleaned = raw.replace(/[$,%\s]/g, "");
      const num = cleaned === "" ? null : parseFloat(cleaned);
      queue(k, num !== null && Number.isNaN(num) ? null : num);
    },
    [queue],
  );

  const cellRaw = useCallback(
    (year: number, month: number, key: string) => cells[ck(year, month, key)] ?? "",
    [cells],
  );

  const setLabel = useCallback(
    (key: string, label: string) => {
      setLabels((prev) => ({ ...prev, [key]: label }));
      if (!userId) return;
      supabase
        .from("budget_categories")
        .upsert(
          { user_id: userId, location_id: locationId, category_key: key, label },
          { onConflict: "user_id,location_id,category_key" },
        )
        .then(() => undefined);
    },
    [userId, locationId],
  );

  const setSetting = useCallback(
    (year: number, patch: Partial<YearSettings>) => {
      setSettings((prev) => {
        const merged = { ...(prev[year] ?? DEFAULT_SETTINGS), ...patch };
        if (userId) {
          supabase
            .from("budget_year_settings")
            .upsert(
              {
                user_id: userId,
                location_id: locationId,
                year,
                fica_rate: merged.fica_rate,
                futa_suta_rate: merged.futa_suta_rate,
                tax_rate_state: merged.state_tax_rate,
                tax_rate_county: merged.county_tax_rate,
                tax_rate_city: merged.city_tax_rate,
                starting_cash: merged.beginning_cash,
                beginning_inventory: merged.beginning_inventory,
              },
              { onConflict: "user_id,location_id,year" },
            )
            .then(() => undefined);
        }
        return { ...prev, [year]: merged };
      });
    },
    [userId, locationId],
  );

  const adjustment = useCallback(
    (year: number, key: string) => {
      const raw = cells[ck(year, 0, key)];
      if (!raw) return 0;
      const n = parseFloat(raw.replace(/[%\s]/g, ""));
      return Number.isNaN(n) ? 0 : n / 100;
    },
    [cells],
  );

  const computed = useMemo(() => {
    const out: Record<number, ComputedYear> = {};
    let carryInventory: number | null = null;
    let carrySettings: YearSettings | null = null;

    for (const year of years.all) {
      const isProjected = years.projected.includes(year);
      const base = settings[year] ?? {
        ...DEFAULT_SETTINGS,
        ...(carrySettings ? { fica_rate: carrySettings.fica_rate, futa_suta_rate: carrySettings.futa_suta_rate, state_tax_rate: carrySettings.state_tax_rate, county_tax_rate: carrySettings.county_tax_rate, city_tax_rate: carrySettings.city_tax_rate } : {}),
      };
      const yearSettings: YearSettings = {
        ...base,
        beginning_inventory:
          settings[year]?.beginning_inventory ?? (carryInventory ?? base.beginning_inventory),
      };

      // Raw inputs for this year
      const raw: ValueMap = {};
      for (const key of INPUT_KEYS) {
        raw[key] = Array.from({ length: 12 }, (_, m) => {
          const typed = cells[ck(year, m + 1, key)];
          if (typed !== undefined && typed !== "") {
            const n = parseFloat(typed.replace(/[$,\s]/g, ""));
            return Number.isNaN(n) ? 0 : n;
          }
          if (!isProjected) {
            const kpi = kpiActuals[ck(year, m + 1, key)];
            if (kpi !== undefined) return kpi;
          }
          return 0;
        });
      }

      let inputs = raw;
      if (isProjected) {
        const prior = out[year - 1]?.values ?? {};
        const adj: Record<string, number> = {};
        INPUT_KEYS.forEach((k) => (adj[k] = adjustment(year, k)));
        inputs = projectInputs(prior, adj, raw);
      }

      out[year] = computeYear(inputs, yearSettings);
      carryInventory = out[year].endingInventoryDec;
      carrySettings = yearSettings;
    }
    return out;
  }, [cells, settings, kpiActuals, years, adjustment]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return {
    loading,
    years,
    labels: useMemo(() => {
      const out: Record<string, string> = {};
      Object.keys(LINE_BY_KEY).forEach((k) => {
        out[k] = labels[k] ?? LINE_BY_KEY[k].label;
      });
      return out;
    }, [labels]),
    setLabel,
    settings,
    setSetting,
    cellRaw,
    setCell,
    adjustment,
    computed,
    kpiActuals,
    saving,
  };
}

export const zeroSeries = zeros;
