# Budget & Cash Flow Planner (in-portal)

Rebuild your boss's budget planner as a login-gated section of the portal instead of a shareable file. Every user gets it, their figures save to their own account, and past-year actuals pre-fill from the KPI data they already submit.

## Why in-portal

An Excel file, however locked, can be forwarded and its password stripped in minutes. Inside the portal the calculations live on our side, the numbers belong to each account, and access can be switched off for anyone who leaves.

## What a user sees

A new "Budget Planner" item in the top navigation, with a store picker (multi-store accounts) and these sections:

1. **Categories** — their own names for each income, expense and pawn line, seeded with the standard list (Retail Sales In Store/Online, COGS, PSC Collected, Tax Exempt lines, Misc Income, 3 Custom Income, 29 expense lines, 5 Custom Expense, plus the four pawn activity lines). Renaming a line renames it everywhere.
2. **Year grids — 4 actual years + 3 projected years** (rolling, based on the current year). Actual years: Jan–Dec entry with Annual Total and year-over-year growth. Auto lines match the workbook exactly:
   - Total Retail Sales = In Store + Online
   - Gross Profit = Total Retail Sales − COGS
   - Total Tax Exempt = Scrap + Other
   - Total Income = Retail + PSC + Tax Exempt + Misc + 3 Customs
   - FICA = (Executive + Staff Wages) × FICA rate; FUTA/SUTA likewise — per-year rate settings panel, FICA pre-set to 7.65%, FUTA/SUTA to 0%
   - Total Expenses = sum of the 29 expense lines
   - Net Operating Income = Total Income − COGS − Total Expenses
   - Pawn & inventory block: Beginning + Buys + Defaults − COGS = Ending Inventory, rolling into next month
   - Sales tax: State/County/City rates auto-summed; Collected = Taxable Retail Sales × total rate; Remitted = last month's Collected
   - Projected years: one % adjustment per line applied to every month of the prior year, preserving seasonality, with the option to override a single month.
3. **Cash Flow** — monthly beginning cash, cash in/out, loans, redeems, buys, burn rate (loans + buys), sales tax in/out, net cash flow and ending cash, chained month to month across the current year and the three projected years, from a starting bank balance the user enters.
4. **Budget vs Actual** — budget pulled automatically for the nearest budget year, actual typed in per month, variance $ and % calculated.
5. **Dashboard** — annual Total Income, Total Expenses, Net Operating Income across all seven years, plus burn rate, ending inventory, and year-end cash, with a trend chart.

## Pre-fill from existing KPI data

For actual years, months already submitted fill in automatically and are marked as coming from their KPI submissions; a user can override any cell. Mapped lines include retail sales, retail COGS, PSC collected, tax exempt sales, ending inventory, pawn loans/redeems/defaults/buys, sales tax collected, and the full Income and Monthly Expenses set already captured on the upload page. Anything with no matching KPI stays blank for manual entry.

## Protection

- Access requires login; the planner is server-backed, so there is no file to pass along.
- Data is scoped to the signed-in account by database access rules.
- A short notice at the top of the planner states it is proprietary to Pawn Gorillas Mastermind and licensed to that member only.
- Any print/export view is stamped with the member's name, number and the date.
- Admins can freeze an account, which already blocks access.

## Technical notes

- New tables: `budget_categories` (per user/location, ordered, renameable, system key + custom label), `budget_year_settings` (year, type actual/projected, payroll and sales-tax rates, starting cash), `budget_cells` (user, location, year, month, category key, value, source manual/kpi), `budget_actuals` (budget-vs-actual entries). All with GRANTs to `authenticated`, RLS scoped to `auth.uid()`, admin read policy, and updated-at triggers.
- Calculation engine in `src/lib/budgetPlanner/` — pure functions mirroring each workbook formula, unit-testable, reused by the grids, cash flow and dashboard.
- New route `/budget-planner` behind `ProtectedRoute`, page under `src/pages/BudgetPlanner.tsx` with tabbed sections and components under `src/components/budget/`.
- Pre-fill via a hook that batches `kpi_entries` reads (using the existing batched range fetching) and maps `field_name` to category keys through a single mapping table.
- Debounced autosave per cell, same 2-decimal numeric rules and currency handling as the upload page.
- Existing KPI upload, dashboard and export behaviour is untouched.

## Sequence

1. Database tables and access rules.
2. Calculation engine plus mapping table.
3. Categories and year grids with autosave and pre-fill.
4. Cash Flow.
5. Budget vs Actual and Dashboard.
6. Navigation link, licence notice and stamped print view.
