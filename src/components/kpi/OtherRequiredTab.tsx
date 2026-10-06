import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pencil, Check, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useKpiFieldConfig } from "@/hooks/useKpiFieldConfig";
import { useUserFieldLabels } from "@/hooks/useUserFieldLabels";
import { normalizeCurrencyValue } from "@/lib/utils";
import { type PlannerMode, MAX_CUSTOM_EXPENSES, MAX_CUSTOM_INCOMES, customSlot } from "@/lib/budgetPlanner/categories";
import { useCustomSlots } from "@/hooks/useCustomSlots";
import CustomSlotControls from "@/components/budget/CustomSlotControls";

interface OtherRequiredTabProps {
  userId: string | null;
  locationId: string | null;
  year: number | null;
  month: number | null;
  currency: string;
  plannerMode: PlannerMode;
}

const NUMERIC = /^-?\d*\.?\d{0,2}$/;
const isCustomSlot = (name: string) => name.startsWith("custom_income_") || name.startsWith("custom_expense_");

const FULL_INCOME_FIELDS = [
  "beginning_cash", "misc_income",
  ...Array.from({ length: MAX_CUSTOM_INCOMES }, (_, index) => `custom_income_${index + 1}`),
];
const FULL_EXPENSE_FIELDS = [
  "exec_wages", "staff_wages", "payroll_tax_fica", "payroll_tax_futa_suta",
  "medical_insurance", "liability_insurance", "other_insurance", "rent",
  "utilities_phone", "utilities_cable_internet", "utilities_water", "utilities_gas_electric",
  "marketing_print", "marketing_text_sms", "marketing_social_media", "marketing_online_digital_ads",
  "marketing_tv_radio", "maintenance_repairs", "travel", "meals_entertainment", "office_supplies",
  "professional_fees", "bank_card_fees", "misc_expense",
  ...Array.from({ length: MAX_CUSTOM_EXPENSES }, (_, index) => `custom_expense_${index + 1}`),
];
const CONDENSED_INCOME_FIELDS = [
  "beginning_cash", "misc_income",
  ...Array.from({ length: MAX_CUSTOM_INCOMES }, (_, index) => `custom_income_${index + 1}`),
];
const CONDENSED_EXPENSE_FIELDS = [
  "condensed_wages", "condensed_insurance", "rent", "condensed_utilities", "condensed_marketing",
  "maintenance_repairs", "condensed_travel_meals", "office_supplies", "professional_fees",
  "bank_card_fees", "misc_expense",
  ...Array.from({ length: MAX_CUSTOM_EXPENSES }, (_, index) => `custom_expense_${index + 1}`),
];

interface FieldRowProps {
  name: string;
  label: string;
  isCurrency: boolean;
  editableLabel: boolean;
  value: string;
  onChange: (name: string, value: string) => void;
  onRename: (name: string, label: string) => void;
}

const FieldRow = ({ name, label, isCurrency, editableLabel, value, onChange, onRename }: FieldRowProps) => {
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label);
  const [error, setError] = useState("");

  useEffect(() => { setDraftLabel(label); }, [label]);

  const commit = () => {
    setEditing(false);
    if (draftLabel.trim() !== label) onRename(name, draftLabel);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        {editing ? (
          <Input
            autoFocus
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
            className="h-8 flex-1 text-sm"
            placeholder="Name this line"
          />
        ) : (
          <Label htmlFor={name} className="text-sm text-foreground flex-1 flex items-center gap-1 min-w-0">
            <span className="truncate">{label}</span>
            {editableLabel && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Rename ${label}`}
                onClick={() => setEditing(true)}
                className="h-6 w-6 text-muted-foreground flex-shrink-0"
              >
                <Pencil className="w-3 h-3" />
              </Button>
            )}
          </Label>
        )}
        {editing ? (
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onMouseDown={(e) => e.preventDefault()} onClick={commit}>
            <Check className="w-4 h-4" />
          </Button>
        ) : (
          <div className="relative flex-shrink-0">
            {isCurrency && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">$</span>
            )}
            <Input
              id={name}
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => {
                if (NUMERIC.test(e.target.value) || e.target.value === "") {
                  setError("");
                  onChange(name, e.target.value);
                } else {
                  setError("Must be a number");
                }
              }}
              className={`w-32 text-right ${isCurrency ? "pl-6" : ""} ${error ? "border-destructive" : ""}`}
              placeholder="0"
            />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive text-right">{error}</p>}
    </div>
  );
};

const OtherRequiredTab = ({ userId, locationId, year, month, currency, plannerMode }: OtherRequiredTabProps) => {
  const { data: allFields, isLoading } = useKpiFieldConfig();
  const { labels, saveLabel } = useUserFieldLabels(userId, plannerMode);
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { reviewsField, incomeFields, expenseFields } = useMemo(() => {
    const visible = (allFields ?? []).filter((f) => f.is_visible);
    const byName = new Map(visible.map((field) => [field.field_name, field]));
    const incomeNames = plannerMode === "condensed" ? CONDENSED_INCOME_FIELDS : FULL_INCOME_FIELDS;
    const expenseNames = plannerMode === "condensed" ? CONDENSED_EXPENSE_FIELDS : FULL_EXPENSE_FIELDS;
    return {
      reviewsField: visible.find((f) => f.field_name === "num_google_reviews") ?? null,
      incomeFields: incomeNames.map((name) => byName.get(name)).filter((field): field is NonNullable<typeof field> => !!field),
      expenseFields: expenseNames.map((name) => byName.get(name)).filter((field): field is NonNullable<typeof field> => !!field),
    };
  }, [allFields, plannerMode]);

  const labelFor = (fieldName: string, fallback: string) => labels[fieldName] || fallback;

  const usedCustom = useMemo(() => {
    const max = { income: 0, expense: 0 };
    [...incomeFields, ...expenseFields].forEach((f) => {
      const slot = customSlot(f.field_name);
      if (slot && ((values[f.field_name] ?? "").trim() !== "" || !!labels[f.field_name]) && slot.n > max[slot.kind]) max[slot.kind] = slot.n;
    });
    return max;
  }, [incomeFields, expenseFields, values, labels]);
  const slots = useCustomSlots(userId, plannerMode, usedCustom);

  // Prefill saved values for the selected store + period
  useEffect(() => {
    if (!userId || !year || !month) { setValues({}); return; }
    let cancelled = false;

    const load = async () => {
      let query = supabase
        .from("kpi_entries")
        .select("field_name, field_value")
        .eq("user_id", userId)
        .eq("year", year)
        .eq("month", month);

      query = locationId ? query.eq("location_id", locationId) : query.is("location_id", null);

      const { data } = await query;
      if (cancelled) return;
      const next: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { if (r.field_value != null) next[r.field_name] = String(r.field_value); });
      setValues(next);
    };

    load();
    return () => { cancelled = true; };
  }, [userId, year, month, locationId, plannerMode]);

  const handleChange = (name: string, value: string) => setValues((prev) => ({ ...prev, [name]: value }));

  const handleSave = async () => {
    if (!userId || !year || !month) {
      toast({ title: "Select a period", description: "Choose a year and month before saving.", variant: "destructive" });
      return;
    }

    const rows: any[] = [];
    const push = (field: { field_name: string; field_label: string }, category: string, isCurrency: boolean) => {
      const raw = values[field.field_name];
      if (raw === undefined || raw === null || raw.trim() === "") return;
      rows.push({
        user_id: userId,
        location_id: locationId,
        year,
        month,
        category,
        field_name: field.field_name,
        field_label: labelFor(field.field_name, field.field_label),
        field_value: isCurrency ? normalizeCurrencyValue(raw) : raw.trim(),
        currency,
      });
    };

    if (reviewsField) push(reviewsField, reviewsField.category, false);
    incomeFields.forEach((f) => push(f, "income", true));
    expenseFields.forEach((f) => push(f, "expenses", true));

    if (rows.length === 0) {
      toast({ title: "Nothing to save", description: "Enter at least one value first.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("kpi_entries")
        .upsert(rows, { onConflict: "user_id,location_id,year,month,field_name" });
      if (error) throw error;
      toast({ title: "Saved", description: `${rows.length} values saved for ${month}/${year}.` });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground text-center py-8">Loading fields...</p>;
  }

  const shownExpenses = expenseFields.filter((f) => slots.isVisible(f.field_name));
  const shownIncome = incomeFields.filter((f) => slots.isVisible(f.field_name));
  const half = Math.ceil(shownExpenses.length / 2);
  const expenseCols = [shownExpenses.slice(0, half), shownExpenses.slice(half)];

  const renderRows = (fields: typeof incomeFields, isCurrency: boolean) =>
    fields.map((f) => (
      <FieldRow
        key={f.field_name}
        name={f.field_name}
        label={labelFor(f.field_name, f.field_label)}
        isCurrency={isCurrency}
        editableLabel={isCustomSlot(f.field_name)}
        value={values[f.field_name] ?? ""}
        onChange={handleChange}
        onRename={saveLabel}
      />
    ));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        These values can't be read from your PawnMate backup, so enter them here. Nothing on this tab is required.
      </p>

      {reviewsField && (
        <div className="bg-card rounded-lg border border-border p-6 max-w-md">
          {renderRows([reviewsField] as any, false)}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Income</h3>
          <div className="space-y-3">{renderRows(shownIncome, true)}</div>
          <CustomSlotControls className="mt-4" slots={slots} kind="income" />
        </div>

        <div className="bg-card rounded-lg border border-border p-6 xl:col-span-2">
          <h3 className="text-lg font-bold text-foreground mb-4">Monthly Expenses</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {expenseCols.map((col, i) => (
              <div key={i} className="space-y-3">{renderRows(col, true)}</div>
            ))}
          </div>
          <CustomSlotControls className="mt-4" slots={slots} kind="expense" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Values"}
        </Button>
      </div>
    </div>
  );
};

export default OtherRequiredTab;
