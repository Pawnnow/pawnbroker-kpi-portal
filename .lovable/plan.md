
# Fix: "Total $" False Validation Failure

## Root Cause

The `aged_col_total_dollar` field has `category = "aged_inventory"` and `is_required = true` in the database. The `requiredFieldNames` computation in `useKpiFieldConfig.ts` only excludes `category !== "aged_inventory_row"` -- it does NOT exclude `"aged_inventory"` columns. So `aged_col_total_dollar` ends up in the regular required fields list and gets validated against pawn/merchandise/marketing values, where it will never be found.

The aged inventory grid has its own separate validation (checking `agedInventoryValues` with the correct key), so the column-level required flag should not be checked as a regular field.

## Fix

**File: `src/hooks/useKpiFieldConfig.ts`** (lines 61-69)

Update both `requiredFieldNames` and `requiredFieldLabels` filters to also exclude the `"aged_inventory"` category:

```ts
// Before
f.category !== "aged_inventory_row"

// After
f.category !== "aged_inventory_row" && f.category !== "aged_inventory"
```

This is a two-line change (one in each filter) that prevents aged inventory column configs from leaking into the regular field validation, while preserving the dedicated grid-level validation that already handles the "365+ Days / Total $" requirement correctly.
