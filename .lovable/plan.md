

# Add Entry Creation for Empty Fields + Two-Decimal Limit

## Changes to `src/pages/ClientDashboard.tsx`

1. **Add `handleCreate` function** — inserts a new `kpi_entries` row via Supabase with current user/year/month/location context, then appends to local state.

2. **Add `addingFieldName` state** — tracks which empty field is being filled (alongside existing `editingId`/`editValue`).

3. **Update `renderFieldRow`** — empty fields (no entry) get a pencil icon; clicking opens inline input; save calls `handleCreate`.

4. **Update `renderReadOnlyGrid`** — same treatment for empty grid cells.

5. **Always show KPI layout** — remove the `entries.length === 0` gate that hides columns/grids. Show the field structure even when no data exists.

6. **Two-decimal validation on inline edit inputs** — validate that values don't exceed 2 decimal places before saving. Pattern: `/^-?\d*\.?\d{0,2}$/`.

## Changes to `src/components/kpi/KpiInputColumn.tsx`

7. **Two-decimal validation** — update `validateNumeric` to reject values with more than 2 decimal places. Change pattern from `/^-?\d*\.?\d*$/` to `/^-?\d*\.?\d{0,2}$/`.

## Changes to `src/components/kpi/DataGrid.tsx`

8. **Two-decimal validation** — same pattern change in `validateNumeric`.

## No database changes needed

Existing RLS policies already allow users to insert their own entries.

