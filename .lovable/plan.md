# Group Condensed Custom Expenses at the Bottom

## Summary
Reorder the **Condensed** planner’s Monthly Expenses section so Custom Expense 1–16 appear together at the bottom, immediately before Total Expenses and Net Operating Income.

The Full planner will remain unchanged.

## Implementation
- Keep every custom expense’s existing key, label, saved value, KPI prefill mapping, and renameable behavior.
- Move only their display positions in the Condensed expense list.
- Keep all standard expenses and calculated payroll-tax rows above the custom-expense group.
- Leave expense totals, projections, overrides, cash flow, dashboard, Budget vs Actual, and database storage unchanged.

## Verification
- Confirm Condensed shows Custom Expense 1–16 together at the bottom.
- Confirm Full retains its current order.
- Confirm existing custom-expense values still appear under the same labels and contribute to Total Expenses.
- Run the project checks and verify both planner views in the browser.
