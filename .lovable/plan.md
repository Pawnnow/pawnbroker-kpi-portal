# Full and Condensed PawnMate Manual Upload Views

## Summary
Add the same **Condensed / Full** selector used by the Budget Planner to the PawnMate upload page, defaulting to Condensed.

The selector will affect only **Other Required**. The Backup Upload extractor, its results, and its saving logic will not change.

## Other Required views

### Full
- Preserve the current Other Required fields, order, saved values, and behavior.

### Condensed
Show only the manually entered items that feed the Condensed Budget Planner:
- New Google Reviews and Beginning Cash
- Income: Misc Income and Custom Income 1–5
- Monthly Expenses: Wages, Insurance, Rent, Utilities, Marketing, Maintenance & Repairs, Travel & Meals, Office Supplies, Professional Fees, Bank & Credit Card Fees, Misc Expense, and Custom Expense 1–16
- Keep the custom expenses grouped at the bottom, matching the Condensed planner
- Do not show calculated rows or values already supplied by the unchanged extractor

## Data behavior
- Add dedicated database fields for the five combined Condensed inputs: Wages, Insurance, Utilities, Marketing, and Travel & Meals.
- Keep detailed Full fields unchanged; Condensed entries will never overwrite Full detail.
- Make the Condensed planner prefer a saved combined value for a month, while falling back to the sum of existing detailed KPI values when no combined value exists. This preserves useful historical prefills without double-counting.
- Add the Condensed-only Custom Income 4–5 and Custom Expense 6–16 definitions needed by the upload form.
- Keep shared categories such as Rent, Misc Income, and Custom 1–5 on their existing database fields.
- Preserve the existing store, period, currency, upsert, and prefill behavior.

## Custom labels
- Add a Full/Condensed mode to custom upload labels, with existing labels retained as Full.
- Renaming a custom line in Condensed will not rename the corresponding Full line, and vice versa.

## Interface
- Place the selector above the PawnMate Backup Upload / Other Required tabs.
- Default to Condensed, matching the Budget Planner.
- Keep the two existing upload tabs and all extractor controls unchanged.

## Technical details
- Add the new field definitions through a database migration without modifying historical KPI rows.
- Extend the custom-label table and uniqueness rule with planner mode; retain existing labels under Full.
- Drive the manual form from explicit Full and Condensed field lists so calculated/extractor-provided categories cannot appear accidentally.
- Update the Condensed planner’s KPI mapping to recognize the new combined fields with legacy-detail fallback.

## Verification
- Verify changing the selector does not alter or reset extractor state.
- Verify Full displays the current manual form unchanged.
- Verify Condensed displays only the listed fields and saves/reloads values for the selected store and period.
- Verify custom labels remain separate between modes.
- Verify combined Condensed values prefill the Condensed actual year without double-counting detailed fields.
- Verify Full planner prefills and all exports remain unchanged.
- Run project checks and test both modes in the signed-in upload and planner pages.
