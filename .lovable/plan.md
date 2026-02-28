

# Add Mandatory KPI Fields (Admin-Controlled)

## Overview
Allow admins to mark specific KPI fields as mandatory. On the KPI Upload page, mandatory fields will show a red asterisk next to their label and have a light gray background on their input boxes. When submitting, if any mandatory fields are empty, a dialog will list the missing ones.

## Database Change

### Add `is_required` column to `kpi_field_config`
```sql
ALTER TABLE public.kpi_field_config
  ADD COLUMN is_required boolean NOT NULL DEFAULT false;
```
No new RLS policies needed -- existing policies already allow admin UPDATE and authenticated SELECT.

## Admin UI: FieldVisibilityManager

### `src/components/admin/FieldVisibilityManager.tsx`
- Add a second toggle (or checkbox) labeled "Required" next to each field's existing visibility switch
- Only show the Required toggle when the field is visible (no point requiring a hidden field)
- Add a `toggleRequired` function that updates `is_required` via Supabase and optimistically updates the query cache
- Update the category summary line to also show required count, e.g. "12/16 visible, 3 required"

## Hook: useKpiFieldConfig

### `src/hooks/useKpiFieldConfig.ts`
- Add `is_required` to the `KpiFieldConfig` interface
- In `useVisibleKpiFields`, update the return shape for `pawnKpis`, `merchandiseKpis`, `marketingKpis` to include `isRequired` in each field object: `{ name, label, isRequired }`
- Add a helper `requiredFieldNames` that returns a flat list of all visible + required field names for validation

## KPI Upload Page: Visual Indicators

### `src/components/kpi/KpiInputColumn.tsx`
- Accept an optional `requiredFields` set (or add `isRequired` to the `KpiField` interface)
- For required fields:
  - Append a red asterisk (`<span className="text-red-500">*</span>`) after the label text
  - Add `bg-gray-100` (light mode) / `bg-gray-800` (dark mode) class to the Input component

### `src/pages/KpiUpload.tsx`
- Pass `isRequired` info through to `KpiInputColumn` for each category
- In `handleSubmit`, before proceeding:
  1. Collect all visible+required field names from the hook
  2. Check which ones have empty values
  3. If any are missing, show an alert dialog: "Your submission is missing values for: [list of missing field labels]."
  4. Block submission until resolved

## Files Modified
1. **Database migration** -- add `is_required` column
2. **`src/hooks/useKpiFieldConfig.ts`** -- add `is_required` to interface and return objects
3. **`src/components/admin/FieldVisibilityManager.tsx`** -- add Required toggle per field
4. **`src/components/kpi/KpiInputColumn.tsx`** -- red asterisk + gray background for required fields
5. **`src/pages/KpiUpload.tsx`** -- validation logic + missing-values dialog

