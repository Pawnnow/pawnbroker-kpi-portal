# Budget Planner: YoY Growth % and % of Revenue columns

## What changes

Each year tab in the planner gets two new read-only columns to the right of the Annual Total column:

1. **YoY Growth %** — how that line's annual total compares with the same line in the previous year.
   - Actual years: compared against the previous actual year. The earliest year shows "N/A - no prior year".
   - Budget years: compared against the year the budget grows from (2027 Budget vs 2026, 2028 Budget vs 2027 actual or 2027 Budget, 2029 Budget vs 2028 Budget). Budget tabs keep their existing "% Adjustment" entry column on the left.
2. **% of Revenue** — that line's annual total divided by the year's Total Income annual total. Shows "-" when Total Income is zero.

Both columns apply to every row (income, expenses, and pawn/inventory/sales-tax lines), matching the workbook. Formatting follows the workbook: one decimal percent, negatives in parentheses, dash when the value can't be computed.

## Technical notes

- Add helpers to `src/lib/budgetPlanner/engine.ts`:
  - `yoyGrowth(currentTotal, priorTotal)` returning `number | null` (null when prior is 0/absent) — mirrors `IFERROR((O-prior)/ABS(prior),"-")`.
  - `pctOfRevenue(total, totalIncomeTotal)` returning `number | null`.
- `useBudgetPlanner` already computes every tab's `values` and knows each tab's source year (the projection chain with the 2027-actual fallback). Expose a `priorTabId` per tab so `YearGrid` can look up `data.computed[priorTabId]` for the comparison; the earliest actual tab has no prior.
- `YearGrid.tsx` renders the two extra `<th>`/`<td>` columns after Total, using `sum(series)` for the current line and `sum(priorSeries)` for the prior year, plus `sum(computed.values.total_income)` for the revenue base. Update the section-header `colSpan` accordingly.
- Read-only display only — no new stored values, no schema change, no change to Cash Flow, Budget vs Actual, Dashboard, or KPI data.
