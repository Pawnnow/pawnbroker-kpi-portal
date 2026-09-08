import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INCOME_LINES, EXPENSE_LINES, PAWN_LINES, MONTHS, BudgetLine } from "@/lib/budgetPlanner/categories";
import { fmtMoney, sum, DEFAULT_SETTINGS } from "@/lib/budgetPlanner/engine";
import type { BudgetPlannerData } from "@/hooks/useBudgetPlanner";

interface Props {
  year: number;
  isProjected: boolean;
  data: BudgetPlannerData;
}

const SECTIONS: Array<{ title: string; lines: BudgetLine[] }> = [
  { title: "Income", lines: INCOME_LINES },
  { title: "Monthly Expenses", lines: EXPENSE_LINES },
  { title: "Pawn Activity, Inventory & Sales Tax", lines: PAWN_LINES },
];

const YearGrid = ({ year, isProjected, data }: Props) => {
  const computed = data.computed[year];
  const settings = data.settings[year] ?? DEFAULT_SETTINGS;

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
        <h3 className="font-semibold mb-3">{year} Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {numberField("FICA %", settings.fica_rate, (n) => data.setSetting(year, { fica_rate: n }), true)}
          {numberField("FUTA/SUTA %", settings.futa_suta_rate, (n) => data.setSetting(year, { futa_suta_rate: n }), true)}
          {numberField("State Tax %", settings.state_tax_rate, (n) => data.setSetting(year, { state_tax_rate: n }), true)}
          {numberField("County Tax %", settings.county_tax_rate, (n) => data.setSetting(year, { county_tax_rate: n }), true)}
          {numberField("City Tax %", settings.city_tax_rate, (n) => data.setSetting(year, { city_tax_rate: n }), true)}
          {numberField("Beginning Inventory", settings.beginning_inventory, (n) => data.setSetting(year, { beginning_inventory: n }))}
          {numberField("Beginning Cash", settings.beginning_cash, (n) => data.setSetting(year, { beginning_cash: n }))}
        </div>
      </div>

      {isProjected && (
        <p className="text-sm text-muted-foreground">
          Projected year: each month starts from the same month of {year - 1} adjusted by the % you set in the
          first column. Type a value in any month to override that month.
        </p>
      )}

      <div className="overflow-x-auto bg-card border border-border rounded-lg">
        <table className="text-sm w-full border-collapse">
          <thead className="sticky top-0 bg-muted">
            <tr>
              <th className="text-left p-2 min-w-[240px] sticky left-0 bg-muted z-10">Category</th>
              {isProjected && <th className="p-2 w-20">Adj %</th>}
              {MONTHS.map((m) => (
                <th key={m} className="p-2 w-24 text-right">{m}</th>
              ))}
              <th className="p-2 w-28 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((section) => (
              <>
                <tr key={section.title} className="bg-secondary/60">
                  <td className="p-2 font-semibold sticky left-0 bg-secondary/60" colSpan={MONTHS.length + (isProjected ? 3 : 2)}>
                    {section.title}
                  </td>
                </tr>
                {section.lines.map((line) => {
                  const series = computed?.values[line.key] ?? Array(12).fill(0);
                  const isCalc = line.kind === "calc";
                  return (
                    <tr key={line.key} className={line.emphasis ? "font-semibold bg-muted/40" : ""}>
                      <td className="p-2 sticky left-0 bg-card border-r border-border">{data.labels[line.key]}</td>
                      {isProjected && (
                        <td className="p-1">
                          {!isCalc && (
                            <Input
                              className="h-8 text-right px-1"
                              value={data.cellRaw(year, 0, line.key)}
                              onChange={(e) => data.setCell(year, 0, line.key, e.target.value)}
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
                              value={data.cellRaw(year, i + 1, line.key)}
                              placeholder={fmtMoney(series[i])}
                              onChange={(e) => data.setCell(year, i + 1, line.key, e.target.value)}
                            />
                          </td>
                        ),
                      )}
                      <td className="p-2 text-right tabular-nums font-medium">{fmtMoney(sum(series))}</td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Greyed numbers shown as placeholders come from your submitted KPI data for that month. Typing a value
        overrides it.
      </p>
    </div>
  );
};

export default YearGrid;
