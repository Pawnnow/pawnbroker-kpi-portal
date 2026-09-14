import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INCOME_LINES, EXPENSE_LINES, PAWN_LINES, MONTHS, BudgetLine, PlanTab } from "@/lib/budgetPlanner/categories";
import { fmtMoney, sum, DEFAULT_SETTINGS, yoyGrowth, pctOfRevenue, fmtPctCell } from "@/lib/budgetPlanner/engine";
import type { BudgetPlannerData } from "@/hooks/useBudgetPlanner";

interface Props {
  tab: PlanTab;
  data: BudgetPlannerData;
}

const SECTIONS: Array<{ title: string; lines: BudgetLine[] }> = [
  { title: "Income", lines: INCOME_LINES },
  { title: "Monthly Expenses", lines: EXPENSE_LINES },
  { title: "Pawn Activity, Inventory & Sales Tax", lines: PAWN_LINES },
];

const YearGrid = ({ tab, data }: Props) => {
  const isBudget = tab.scenario === "budget";
  const computed = data.computed[tab.id];
  const settings = data.settings[tab.id] ?? DEFAULT_SETTINGS;
  const priorId = data.priorTabId?.[tab.id] ?? null;
  const priorTab = priorId ? data.years.all.find((t) => t.id === priorId) ?? null : null;
  const priorValues = priorId ? data.computed[priorId]?.values : undefined;
  const revenue = sum(computed?.values.total_income ?? []);

  const numberField = (label: string, value: number, onChange: (n: number) => void, isPct = false) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        className="h-8"
        defaultValue={isPct ? (value * 100).toFixed(2) : String(value)}
        onBlur={(e) => {
          const n = parseFloat(e.target.value.replace(/[$,%\s]/g, ""));
          onChange(Number.isNaN(n) ? 0 : isPct ? n / 100 : n);
        }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-3">{tab.label} Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {numberField("FICA %", settings.fica_rate, (n) => data.setSetting(tab.id, { fica_rate: n }), true)}
          {numberField("FUTA/SUTA %", settings.futa_suta_rate, (n) => data.setSetting(tab.id, { futa_suta_rate: n }), true)}
          {numberField("State Tax %", settings.state_tax_rate, (n) => data.setSetting(tab.id, { state_tax_rate: n }), true)}
          {numberField("County Tax %", settings.county_tax_rate, (n) => data.setSetting(tab.id, { county_tax_rate: n }), true)}
          {numberField("City Tax %", settings.city_tax_rate, (n) => data.setSetting(tab.id, { city_tax_rate: n }), true)}
          {numberField("Beginning Inventory", settings.beginning_inventory, (n) => data.setSetting(tab.id, { beginning_inventory: n }))}
          {numberField("Beginning Cash", settings.beginning_cash, (n) => data.setSetting(tab.id, { beginning_cash: n }))}
        </div>
      </div>

      {isBudget && (
        <p className="text-sm text-muted-foreground">
          Budget year: each month starts from the same month of {tab.year - 1} adjusted by the % you set in the
          first column. Type a value in any month to override that month.
        </p>
      )}

      <div className="overflow-x-auto bg-card border border-border rounded-lg">
        <table className="text-sm w-full border-collapse">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="text-left p-2 min-w-[240px] sticky left-0 bg-muted z-10">Category</th>
              {isBudget && <th className="p-2 w-20">Adj %</th>}
              {MONTHS.map((m) => (
                <th key={m} className="p-2 w-24 text-right">{m}</th>
              ))}
              <th className="p-2 w-28 text-right">Total</th>
              <th className="p-2 w-28 text-right">YoY Growth %</th>
              <th className="p-2 w-28 text-right">% of Revenue</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((section) => (
              <>
                <tr key={section.title} className="bg-secondary/60">
                  <td className="p-2 font-semibold sticky left-0 bg-secondary/60" colSpan={MONTHS.length + (isBudget ? 5 : 4)}>
                    {section.title}
                  </td>
                </tr>
                {section.lines.map((line) => {
                  const series = computed?.values[line.key] ?? Array(12).fill(0);
                  const isCalc = line.kind === "calc";
                  const total = sum(series);
                  const yoy = priorValues ? yoyGrowth(total, sum(priorValues[line.key] ?? [])) : null;
                  return (
                    <tr key={line.key} className={line.emphasis ? "font-semibold bg-muted/40" : ""}>
                      <td className="p-2 sticky left-0 bg-card border-r border-border">{data.labels[line.key]}</td>
                      {isBudget && (
                        <td className="p-1">
                          {!isCalc && (
                            <Input
                              className="h-8 text-right px-1"
                              value={data.cellRaw(tab.id, 0, line.key)}
                              onChange={(e) => data.setCell(tab.id, 0, line.key, e.target.value)}
                              placeholder="0"
                            />
                          )}
                        </td>
                      )}
                      {MONTHS.map((m, i) =>
                        isCalc ? (
                          <td key={m} className="p-2 text-right tabular-nums text-muted-foreground">
                            {fmtMoney(series[i])}
                          </td>
                        ) : (
                          <td key={m} className="p-1">
                            <Input
                              className="h-8 text-right px-1 tabular-nums"
                              value={data.cellRaw(tab.id, i + 1, line.key)}
                              placeholder={fmtMoney(series[i])}
                              onChange={(e) => data.setCell(tab.id, i + 1, line.key, e.target.value)}
                            />
                          </td>
                        ),
                      )}
                      <td className="p-2 text-right tabular-nums font-medium">{fmtMoney(total)}</td>
                      <td className="p-2 text-right tabular-nums text-muted-foreground">
                        {priorValues ? fmtPctCell(yoy) : "N/A - no prior year"}
                      </td>
                      <td className="p-2 text-right tabular-nums text-muted-foreground">
                        {fmtPctCell(pctOfRevenue(total, revenue))}
                      </td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {priorTab
          ? `YoY Growth % compares each annual total with ${priorTab.label}. `
          : "YoY Growth % needs a prior year to compare against. "}
        % of Revenue is each annual total divided by Total Income for {tab.label}.
      </p>
      {!isBudget && (
        <p className="text-xs text-muted-foreground">
          Greyed numbers shown as placeholders come from your submitted KPI data for that month. Typing a value
          overrides it.
        </p>
      )}
    </div>
  );
};

export default YearGrid;
