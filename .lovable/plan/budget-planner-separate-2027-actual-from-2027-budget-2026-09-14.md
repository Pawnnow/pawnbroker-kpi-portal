# Budget Planner: separate 2027 Actual from 2027 Budget

## What changes

1. **Tab names** — the projected tabs `2027*`, `2028*`, `2029*` become `2027 Budget`, `2028 Budget`, `2029 Budget`. The asterisk and the "* Projected year" footnote go away.

2. **New "2027" actuals tab** — same layout and behaviour as the 2026 tab: monthly grid with no adjustment-% column, pre-filled from uploaded 2027 KPI data, with typed values overriding the prefill.

3. **Projection chain with automatic fallback**
   - 2027 Budget keeps growing off the 2026 actual year.
   - 2028 Budget grows off 2027 **actuals once any 2027 actual data exists** (uploaded 2027 KPI data or values typed on the 2027 tab). Until then it falls back to growing off 2027 Budget, so the tab is never empty.
   - 2029 Budget grows off 2028 Budget (unchanged).
   - Same rule applied generally going forward: a budget year uses the prior year's actuals when they exist, otherwise the prior year's budget.

4. **Budget vs Actual** — the year pickers list actual years and budget years separately and clearly labelled, so 2027 Budget can be compared against 2027 actual. Defaults to the current budget year vs the matching actual year.

5. **Years shown** — actual tabs cover the four-year window through the current year plus 2027; budget tabs stay at the following three years. The window rolls forward on its own each January.

## Technical notes

- `budget_cells` and `budget_year_settings` currently key rows by `(user_id, location_id, year, month, category_key)`, so a 2027 actual row and a 2027 budget row would collide. Add a `scenario text not null default 'budget'` column to both tables, backfill existing rows to `'budget'`, and replace the unique indexes with ones that include `scenario`. Actual-year rows are written with `scenario = 'actual'`.
- `planYears()` in `src/lib/budgetPlanner/categories.ts` returns tab entries carrying `{ year, scenario, label }` instead of bare numbers.
- `useBudgetPlanner` keys cells by `scenario:year:month:category` and passes `scenario` through load, upsert, and the settings upsert. The `computed` map is keyed by the same tab id, and the projection loop applies the fallback rule above.
- `BudgetPlannerPanel`, `YearGrid`, `CashFlowTable`, `BudgetVsActual`, and `BudgetDashboard` take the tab id rather than a plain year number.
- No change to KPI upload, export, or existing stored budget values.
