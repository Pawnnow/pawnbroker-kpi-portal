# Condensed and Full Budget Planner

## Summary
Add a **Condensed / Full** selector directly above the proprietary notice. Condensed will be the default so clients see the simpler planner first, while Full remains available and unchanged.

The two versions will be **separate plans**, as selected: entering or changing a value in Condensed will not alter Full, and vice versa. Each version will still use uploaded KPI data to prefill its own actual-year tabs where a matching KPI exists.

## Condensed planner contents
Reproduce the uploaded condensed workbook’s structure and formulas:

- **Income:** Retail Sales, COGS, Gross Profit, PSC Collected, Tax Exempt Sales, Misc Income, Custom Income 1–5, Total Income.
- **Expenses:** Wages, Payroll Tax FICA, Payroll Tax FUTA/SUTA, Insurance, Rent, Utilities, Marketing, Maintenance & Repairs, Travel & Meals, Office Supplies, Professional Fees, Bank & Credit Card Fees, Misc Expense, Custom Expense 1–16, Total Expenses, and Net Operating Income.
- **Pawn, inventory, and sales tax:** Pawn Loans Originated, Pawn Redeems Principal, Pawn Defaults moved to inventory, Buys, beginning/ending inventory, taxable retail sales, sales-tax settings, collected tax, and remitted tax.
- Preserve renameable custom income and expense lines independently from the Full planner.
- Match the workbook calculations, including combined-wage payroll taxes, inventory roll-forward, sales tax, totals, net operating income, year-over-year growth, and percent of revenue.

## Tabs and behavior
Both modes will retain the existing portal workflow:

- Instructions
- Dashboard
- Category Setup
- Actual-year tabs
- Budget-year tabs
- Cash Flow
- Budget vs Actual

Condensed will use the same current year/budget sequencing as Full:

- Actual years continue to prefill from uploaded KPI data.
- Each budget uses prior-year actuals once available, otherwise the prior budget.
- Budget adjustments and monthly overrides remain supported.
- Budget vs Actual keeps the existing year selectors and variance calculations, using only the active mode’s plan.
- Dashboard and Cash Flow calculate only from the active mode’s values.

## Data protection and compatibility
- Add a planner-mode identifier to saved cells, year settings, and renamed categories so Condensed and Full records cannot overwrite each other.
- Mark all existing planner records as **Full**, preserving every current value and label.
- Keep uploaded KPI records unchanged; map them separately into the appropriate Condensed input lines, including summing detailed KPI fields into combined categories where appropriate.
- No changes to the existing KPI upload portal or exports.

## Interface
- Place a clear two-option selector above “Pawn Gorillas Budget & Cash Flow Planner — proprietary and confidential.”
- Default to **Condensed** for a less overwhelming first experience.
- Switching modes refreshes every planner tab from that mode’s independent data while retaining the selected store.
- Update Instructions and Category Setup to reflect the active version.

## Technical implementation
- Define separate Full and Condensed category schemas and calculation engines behind one shared planner interface.
- Extend the planner data hook with a `plannerMode` scope for loading, saving, labels, settings, KPI prefills, projections, and comparisons.
- Pass the active mode into year grids, category setup, dashboard, cash flow, instructions, and Budget vs Actual.
- Apply a database migration that backfills existing rows to `full` before enforcing mode-aware uniqueness.
- Record the dual-mode storage decision in the project architecture notes.

## Verification
- Confirm existing Full values remain visible and unchanged after the migration.
- Enter different values into the same period in Condensed and Full and verify they remain independent after reload.
- Verify Condensed actual KPI prefills and combined mappings.
- Verify actual-to-budget fallback logic, monthly overrides, YoY %, % of revenue, cash flow, inventory, dashboard, and Budget vs Actual in both modes.
- Check the selector and wide tables on desktop and mobile, then confirm the preview builds without errors.
