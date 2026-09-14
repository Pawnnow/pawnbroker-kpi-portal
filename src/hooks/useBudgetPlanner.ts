import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { KPI_TO_LINE, INPUT_KEYS, LINE_BY_KEY, planYears, PlanTab } from "@/lib/budgetPlanner/categories";
import {
  DEFAULT_SETTINGS,
  YearSettings,
  ValueMap,
  zeros,
  sum,
  computeYear,
  projectInputs,
  ComputedYear,
} from "@/lib/budgetPlanner/engine";

/** `${scenario}:${year}:${month}:${lineKey}` */
type CellKey = string;

const ck = (scenario: string, year: number, month: number, key: string): CellKey =>
  `${scenario}:${year}:${month}:${key}`;

export interface BudgetPlannerData {
  loading: boolean;
  years: ReturnType<typeof planYears>;
  labels: Record<string, string>;
  setLabel: (key: string, label: string) => void;
  /** settings per tab id (actual-YYYY / budget-YYYY) */
  settings: Record<string, YearSettings>;
  setSetting: (tabId: string, patch: Partial<YearSettings>) => void;
  /** raw user-entered override for a cell, "" if none */
  cellRaw: (tabId: string, month: number, key: string) => string;
  setCell: (tabId: string, month: number, key: string, raw: string) => void;
  /** adjustment % (as decimal) for a budget tab line */
  adjustment: (tabId: string, key: string) => number;
  /** computed values per tab id */
  computed: Record<string, ComputedYear>;
  /** tab id this tab is compared against for YoY growth (null for the earliest) */
  priorTabId: Record<string, string | null>;
  kpiActuals: Record<string, number>; // `${scenario}:${year}:${month}:${lineKey}` (actual scenario only)
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
  const [settings, setSettings] = useState<Record<string, YearSettings>>({});
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

      let cellsQ = supabase.from("budget_cells").select("year,month,category_key,value,scenario").eq("user_id", uid);
      let settingsQ = supabase.from("budget_year_settings").select("*, scenario").eq("user_id", uid);
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
        nextCells[
          ck(String(r.scenario ?? "budget"), Number(r.year), Number(r.month), String(r.category_key))
        ] = r.value === null || r.value === undefined ? "" : String(r.value);
      });

      const nextSettings: Record<string, YearSettings> = {};
      (settingsRes.data ?? []).forEach((r) => {
        nextSettings[`${String(r.scenario ?? "budget")}-${Number(r.year)}`] = {
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
        const key = ck("actual", Number(r.year), Number(r.month), line);
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
      const [scenario, year, month, category_key] = key.split(":");
      return {
        user_id: userId,
        location_id: locationId,
        year: Number(year),
        month: Number(month),
        category_key,
        scenario,
        value,
      };
    });
    pending.current.clear();
    setSaving(true);
    await supabase.from("budget_cells").upsert(rows, {
      onConflict: "user_id,location_id,year,month,category_key,scenario",
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
    (tabId: string, month: number, key: string, raw: string) => {
      const [scenario, y] = tabId.split("-");
      const k = ck(scenario, Number(y), month, key);
      setCells((prev) => ({ ...prev, [k]: raw }));
      const cleaned = raw.replace(/[$,%\s]/g, "");
      const num = cleaned === "" ? null : parseFloat(cleaned);
      queue(k, num !== null && Number.isNaN(num) ? null : num);
    },
    [queue],
  );

  const cellRaw = useCallback(
    (tabId: string, month: number, key: string) => {
      const [scenario, y] = tabId.split("-");
      return cells[ck(scenario, Number(y), month, key)] ?? "";
    },
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
    (tabId: string, patch: Partial<YearSettings>) => {
      const [scenario, y] = tabId.split("-");
      const year = Number(y);
      setSettings((prev) => {
        const merged = { ...(prev[tabId] ?? DEFAULT_SETTINGS), ...patch };
        if (userId) {
          supabase
            .from("budget_year_settings")
            .upsert(
              {
                user_id: userId,
                location_id: locationId,
                year,
                scenario,
                fica_rate: merged.fica_rate,
                futa_suta_rate: merged.futa_suta_rate,
                tax_rate_state: merged.state_tax_rate,
                tax_rate_county: merged.county_tax_rate,
                tax_rate_city: merged.city_tax_rate,
                starting_cash: merged.beginning_cash,
                beginning_inventory: merged.beginning_inventory,
              },
              { onConflict: "user_id,location_id,year,scenario" },
            )
            .then(() => undefined);
        }
        return { ...prev, [tabId]: merged };
      });
    },
    [userId, locationId],
  );

  const adjustment = useCallback(
    (tabId: string, key: string) => {
      const [scenario, y] = tabId.split("-");
      const raw = cells[ck(scenario, Number(y), 0, key)];
      if (!raw) return 0;
      const n = parseFloat(raw.replace(/[%\s]/g, ""));
      return Number.isNaN(n) ? 0 : n / 100;
    },
    [cells],
  );

  const computed = useMemo(() => {
    const out: Record<string, ComputedYear> = {};
    let carryInventory: number | null = null;
    let carrySettings: YearSettings | null = null;
    let prevTab: PlanTab | null = null;

    for (const tab of years.all) {
      const isBudget = tab.scenario === "budget";
      const base = settings[tab.id] ?? {
        ...DEFAULT_SETTINGS,
        ...(carrySettings
          ? {
              fica_rate: carrySettings.fica_rate,
              futa_suta_rate: carrySettings.futa_suta_rate,
              state_tax_rate: carrySettings.state_tax_rate,
              county_tax_rate: carrySettings.county_tax_rate,
              city_tax_rate: carrySettings.city_tax_rate,
            }
          : {}),
      };
      const yearSettings: YearSettings = {
        ...base,
        beginning_inventory:
          settings[tab.id]?.beginning_inventory ?? (carryInventory ?? base.beginning_inventory),
      };

      // Raw inputs for this tab
      const raw: ValueMap = {};
      for (const key of INPUT_KEYS) {
        raw[key] = Array.from({ length: 12 }, (_, m) => {
          const typed = cells[ck(tab.scenario, tab.year, m + 1, key)];
          if (typed !== undefined && typed !== "") {
            const n = parseFloat(typed.replace(/[$,\s]/g, ""));
            return Number.isNaN(n) ? 0 : n;
          }
          if (!isBudget) {
            const kpi = kpiActuals[ck("actual", tab.year, m + 1, key)];
            if (kpi !== undefined) return kpi;
          }
          return 0;
        });
      }

      let inputs = raw;
      if (isBudget) {
        // Base = prior year's actuals when they contain data, otherwise the prior
        // budget tab (e.g. 2028 Budget falls back to 2027 Budget until 2027 data exists).
        const priorActualId = `actual-${tab.year - 1}`;
        const priorActual = out[priorActualId];
        const priorActualHasData =
          priorActual && INPUT_KEYS.some((k) => (priorActual.values[k] ?? []).some((v) => v !== 0));
        const baseValues = priorActualHasData
          ? priorActual.values
          : (prevTab ? out[prevTab.id]?.values : undefined) ?? {};
        const adj: Record<string, number> = {};
        INPUT_KEYS.forEach((k) => (adj[k] = adjustment(tab.id, k)));
        inputs = projectInputs(baseValues, adj, raw);
      }

      out[tab.id] = computeYear(inputs, yearSettings);
      carryInventory = out[tab.id].endingInventoryDec;
      carrySettings = yearSettings;
      prevTab = tab;
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
export const sumSeries = sum;
