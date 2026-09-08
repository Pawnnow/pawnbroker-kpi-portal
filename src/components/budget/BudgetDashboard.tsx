import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeCashFlow, fmtMoney, sum, DEFAULT_SETTINGS } from "@/lib/budgetPlanner/engine";
import type { BudgetPlannerData } from "@/hooks/useBudgetPlanner";

const BudgetDashboard = ({ data }: { data: BudgetPlannerData }) => {
  let carryCash = (data.settings[data.years.all[0]] ?? DEFAULT_SETTINGS).beginning_cash;

  const rows = data.years.all.map((year) => {
    const v = data.computed[year]?.values ?? {};
    const beginningCash = data.settings[year]?.beginning_cash ?? carryCash;
    const cf = computeCashFlow(v, beginningCash);
    carryCash = cf.endingCashDec;
    const income = sum(v.total_income ?? []);
    const expenses = sum(v.total_expenses ?? []);
    return {
      year,
      projected: data.years.projected.includes(year),
      income,
      expenses,
      noi: sum(v.net_operating_income ?? []),
      burn: expenses / 12,
      endingInventory: v.ending_inventory?.[11] ?? 0,
      endingCash: cf.endingCashDec,
    };
  });

  const latest = rows[data.years.actual.length - 1];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["Total Income", fmtMoney(latest.income)],
          ["Total Expenses", fmtMoney(latest.expenses)],
          ["Net Operating Income", fmtMoney(latest.noi)],
          ["Avg Monthly Burn", fmtMoney(latest.burn)],
        ].map(([title, value]) => (
          <Card key={title}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title} ({latest.year})</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{value}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="text-sm w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-2">Year</th>
              <th className="p-2 text-right">Total Income</th>
              <th className="p-2 text-right">Total Expenses</th>
              <th className="p-2 text-right">Net Operating Income</th>
              <th className="p-2 text-right">Avg Monthly Burn</th>
              <th className="p-2 text-right">Ending Inventory</th>
              <th className="p-2 text-right">Ending Cash</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year} className={r.projected ? "text-muted-foreground" : ""}>
                <td className="p-2 font-medium">{r.year}{r.projected ? " (projected)" : ""}</td>
                <td className="p-2 text-right tabular-nums">{fmtMoney(r.income)}</td>
                <td className="p-2 text-right tabular-nums">{fmtMoney(r.expenses)}</td>
                <td className="p-2 text-right tabular-nums">{fmtMoney(r.noi)}</td>
                <td className="p-2 text-right tabular-nums">{fmtMoney(r.burn)}</td>
                <td className="p-2 text-right tabular-nums">{fmtMoney(r.endingInventory)}</td>
                <td className="p-2 text-right tabular-nums">{fmtMoney(r.endingCash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BudgetDashboard;
