import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INCOME_LINES, EXPENSE_LINES } from "@/lib/budgetPlanner/categories";
import { fmtMoney, sum } from "@/lib/budgetPlanner/engine";
import type { BudgetPlannerData } from "@/hooks/useBudgetPlanner";

const LINES = [...INCOME_LINES, ...EXPENSE_LINES];

const BudgetVsActual = ({ data }: { data: BudgetPlannerData }) => {
  const currentYear = new Date().getFullYear();
  const [budgetTab, setBudgetTab] = useState(`budget-${currentYear + 1}`);
  const [actualTab, setActualTab] = useState(`actual-${currentYear}`);

  const budget = data.computed[budgetTab]?.values ?? {};
  const actual = data.computed[actualTab]?.values ?? {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div>
          <Label className="mb-1 block">Budget Year</Label>
          <Select value={budgetTab} onValueChange={setBudgetTab}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {data.years.budget.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block">Actual Year</Label>
          <Select value={actualTab} onValueChange={setActualTab}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {data.years.actual.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
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
