import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INCOME_LINES, EXPENSE_LINES } from "@/lib/budgetPlanner/categories";
import { fmtMoney, sum } from "@/lib/budgetPlanner/engine";
import type { BudgetPlannerData } from "@/hooks/useBudgetPlanner";

const LINES = [...INCOME_LINES, ...EXPENSE_LINES];

const BudgetVsActual = ({ data }: { data: BudgetPlannerData }) => {
  const currentYear = data.years.actual[data.years.actual.length - 1];
  const [budgetYear, setBudgetYear] = useState(String(currentYear + 1));
  const [actualYear, setActualYear] = useState(String(currentYear));

  const budget = data.computed[Number(budgetYear)]?.values ?? {};
  const actual = data.computed[Number(actualYear)]?.values ?? {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div>
          <Label className="mb-1 block">Budget Year</Label>
          <Select value={budgetYear} onValueChange={setBudgetYear}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {data.years.all.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block">Actual Year</Label>
          <Select value={actualYear} onValueChange={setActualYear}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {data.years.all.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="text-sm w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-2 min-w-[240px]">Category</th>
              <th className="p-2 text-right w-32">Budget</th>
              <th className="p-2 text-right w-32">Actual</th>
              <th className="p-2 text-right w-32">Variance $</th>
              <th className="p-2 text-right w-28">Variance %</th>
            </tr>
          </thead>
          <tbody>
            {LINES.map((line) => {
              const b = sum(budget[line.key] ?? []);
              const a = sum(actual[line.key] ?? []);
              const diff = a - b;
              const pct = b === 0 ? null : diff / Math.abs(b);
              return (
                <tr key={line.key} className={line.emphasis ? "font-semibold bg-muted/40" : ""}>
                  <td className="p-2">{data.labels[line.key]}</td>
                  <td className="p-2 text-right tabular-nums">{fmtMoney(b)}</td>
                  <td className="p-2 text-right tabular-nums">{fmtMoney(a)}</td>
                  <td className={`p-2 text-right tabular-nums ${diff < 0 ? "text-destructive" : ""}`}>{fmtMoney(diff)}</td>
                  <td className="p-2 text-right tabular-nums">{pct === null ? "—" : `${(pct * 100).toFixed(1)}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BudgetVsActual;
