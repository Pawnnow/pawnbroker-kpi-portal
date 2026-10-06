import { useCallback, useEffect, useState } from "react";
import { customSlot, CustomKind, DEFAULT_CUSTOM, MAX_CUSTOM, PlannerMode } from "@/lib/budgetPlanner/categories";

type Counts = Record<CustomKind, number>;

export interface CustomSlots {
  visible: Counts;
  max: Counts;
  add: (kind: CustomKind) => void;
  /** hide the last empty row; never hides rows with data/names or below the default */
  hide: (kind: CustomKind) => void;
  canHide: (kind: CustomKind) => boolean;
  isVisible: (key: string) => boolean;
}

/** Per-user, per-planner-mode count of visible custom rows (shared by planner and upload tab). */
export function useCustomSlots(userId: string | null, mode: PlannerMode, used: Counts): CustomSlots {
  const storageKey = (kind: CustomKind) =>
    kind === "expense"
      ? `budget-custom-expense-slots:${userId ?? "anon"}:${mode}`
      : `budget-custom-income-slots:${userId ?? "anon"}:${mode}`;
  const read = (kind: CustomKind) => {
    const raw = Number(localStorage.getItem(storageKey(kind)));
    return Number.isFinite(raw) && raw > 0 ? Math.min(raw, MAX_CUSTOM[kind]) : DEFAULT_CUSTOM[kind];
  };
  const [stored, setStored] = useState<Counts>({ ...DEFAULT_CUSTOM });
  useEffect(() => {
    setStored({ income: read("income"), expense: read("expense") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mode]);

  const floor = (kind: CustomKind) => Math.max(used[kind], DEFAULT_CUSTOM[kind]);
  const visible: Counts = {
    income: Math.min(MAX_CUSTOM.income, Math.max(stored.income, floor("income"))),
    expense: Math.min(MAX_CUSTOM.expense, Math.max(stored.expense, floor("expense"))),
  };
  const set = (kind: CustomKind, n: number) => {
    localStorage.setItem(storageKey(kind), String(n));
    setStored((prev) => ({ ...prev, [kind]: n }));
  };
  const add = (kind: CustomKind) => set(kind, Math.min(MAX_CUSTOM[kind], visible[kind] + 1));
  const canHide = (kind: CustomKind) => visible[kind] > floor(kind);
  const hide = (kind: CustomKind) => { if (canHide(kind)) set(kind, visible[kind] - 1); };
  const isVisible = useCallback((key: string) => {
    const slot = customSlot(key);
    return !slot || slot.n <= visible[slot.kind];
  }, [visible.income, visible.expense]);

  return { visible, max: { ...MAX_CUSTOM }, add, hide, canHide, isVisible };
}
