import { MONTHS } from "@/lib/budgetPlanner/categories";
import { computeCashFlow, fmtMoney, sum, DEFAULT_SETTINGS } from "@/lib/budgetPlanner/engine";
import type { BudgetPlannerData } from "@/hooks/useBudgetPlanner";

const CashFlowTable = ({ data }: { data: BudgetPlannerData }) => {
  const currentYear = new Date().getFullYear();
  const startTab = data.years.actual.find((t) => t.year === currentYear) ?? data.years.actual[0];
  const tabsShown = [startTab, ...data.years.budget];

  let carryCash = (data.settings[startTab.id] ?? DEFAULT_SETTINGS).beginning_cash;

  return (
    <div className="space-y-8">
      {tabsShown.map((tab) => {
        const v = data.computed[tab.id]?.values ?? {};
        const beginningCash = data.settings[tab.id]?.beginning_cash ?? carryCash;
        const cf = computeCashFlow(v, beginningCash);
        carryCash = cf.endingCashDec;

        const rows: Array<[string, number[], boolean?]> = [
          ["Beginning Cash", cf.beginning, true],
          ["Total Income", v.total_income ?? [], false],
          ["Pawn Redeems - Principal In", v.pawn_redeems_principal ?? [], false],
          ["Sales Tax Collected", v.sales_tax_collected ?? [], false],
          ["Total Expenses", v.total_expenses ?? [], false],
          ["Pawn Loans Originated", v.pawn_loans_originated ?? [], false],
          ["Buys - Outright", v.buys_outright ?? [], false],
          ["Sales Tax Remitted", v.sales_tax_remitted ?? [], false],
          ["Monthly Burn Rate", cf.burn, false],
          ["Net Cash Flow", cf.net, true],
          ["Ending Cash", cf.ending, true],
        ];

        return (
          <div key={year} className="bg-card border border-border rounded-lg overflow-x-auto">
            <h3 className="font-semibold p-3 border-b border-border">{year} Cash Flow</h3>
            <table className="text-sm w-full border-collapse">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 min-w-[220px]">Line</th>
                  {MONTHS.map((m) => (
                    <th key={m} className="p-2 text-right w-24">{m}</th>
                  ))}
                  <th className="p-2 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, series, emphasis]) => (
                  <tr key={label} className={emphasis ? "font-semibold bg-muted/40" : ""}>
                    <td className="p-2">{label}</td>
                    {MONTHS.map((m, i) => (
                      <td key={m} className="p-2 text-right tabular-nums">{fmtMoney(series[i] ?? 0)}</td>
                    ))}
                    <td className="p-2 text-right tabular-nums">
                      {label === "Beginning Cash" || label === "Ending Cash" ? "—" : fmtMoney(sum(series as number[]))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

export default CashFlowTable;
