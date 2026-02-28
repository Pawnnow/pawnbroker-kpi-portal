

# Three Changes: Group Labels, New Merchandise KPIs, and Mandatory Aged Inventory Rows

## 1. Rename Group 1 to "Founders" in Dropdowns

Update the group dropdown in both the Create User form and the Edit User dialog so that Group 1 displays as "Founders" instead of "Group 1". All other groups keep their current labels (Group 0, Group 2, Group 3, etc.).

### Files changed
- `src/components/admin/CreateUserForm.tsx` -- replace the `[0,1,2,3,4,5].map(...)` with a label map so group 1 renders as "Founders"
- `src/components/admin/EditUserDialog.tsx` -- same change

---

## 2. Add "Monthly Expenses" and "Net Profit" to Merchandise KPIs

Insert two new fields in the `MERCHANDISE_KPIS` array in `KpiUpload.tsx`, placed after "COGS for Scrap" and before "Merch. Inventory":

- `monthly_expenses` / "Monthly Expenses"
- `net_profit` / "Net Profit"

### Files changed
- `src/pages/KpiUpload.tsx` -- add the two entries to the `MERCHANDISE_KPIS` constant

### Database seed needed
Insert matching rows into `kpi_field_config` so admins can control visibility and mark them required. This will be done via a migration:
```sql
INSERT INTO public.kpi_field_config (field_name, category, field_label, is_visible, display_order)
VALUES
  ('monthly_expenses', 'merchandise', 'Monthly Expenses', true, 1301),
  ('net_profit', 'merchandise', 'Net Profit', true, 1302);
```
(Display order values placed between "cogs_scrap" and "merch_inventory".)

---

## 3. Make Aged Inventory Rows Configurable as Mandatory

Allow admins to designate entire aged inventory rows (e.g., "0-90 Days") as mandatory. When a row is mandatory, at minimum the "Total $" cell for that row must be filled before submission.

### Database change
Add rows to `kpi_field_config` for each aged inventory row (category: `aged_inventory_row`). These use the existing `is_required` and `is_visible` columns:

```sql
INSERT INTO public.kpi_field_config (field_name, category, field_label, is_visible, is_required, display_order)
VALUES
  ('aged_row_0_90', 'aged_inventory_row', '0-90 Days', true, false, 5001),
  ('aged_row_91_120', 'aged_inventory_row', '91-120 Days', true, false, 5002),
  ('aged_row_121_180', 'aged_inventory_row', '121-180 Days', true, false, 5003),
  ('aged_row_181_210', 'aged_inventory_row', '181-210 Days', true, false, 5004),
  ('aged_row_211_365', 'aged_inventory_row', '211-365 Days', true, false, 5005),
  ('aged_row_365_plus', 'aged_inventory_row', '365+ Days', true, false, 5006);
```

### Admin UI
- `src/components/admin/FieldVisibilityManager.tsx` -- add "Aged Inventory Rows" as a new category section. Admins can toggle "Required" on each row. The "Visible" toggle is kept but mainly for consistency.
- `src/hooks/useKpiFieldConfig.ts` -- add a `CATEGORY_LABELS` entry and expose `requiredAgedRows` (list of row labels that are required) from `useVisibleKpiFields`

### Upload page validation
- `src/pages/KpiUpload.tsx` -- in the submit handler, check each required aged inventory row to ensure its "Total $" cell (key: `{row}_Total Dollar`) has a value. Missing rows are included in the existing missing-fields alert dialog.
- `src/components/kpi/DataGrid.tsx` -- accept an optional `requiredRows` prop. For required rows, highlight the row label with a red asterisk and apply `bg-muted` to cells in that row.

---

## Summary of all files touched

| File | Changes |
|------|---------|
| `src/components/admin/CreateUserForm.tsx` | Group 1 label -> "Founders" |
| `src/components/admin/EditUserDialog.tsx` | Group 1 label -> "Founders" |
| `src/pages/KpiUpload.tsx` | Add 2 merchandise fields; add aged row validation |
| `src/hooks/useKpiFieldConfig.ts` | Expose `requiredAgedRows` |
| `src/components/admin/FieldVisibilityManager.tsx` | Add aged inventory row category |
| `src/components/kpi/DataGrid.tsx` | Accept `requiredRows`, show asterisk + gray bg |
| Database migration | Insert 8 new `kpi_field_config` rows |

