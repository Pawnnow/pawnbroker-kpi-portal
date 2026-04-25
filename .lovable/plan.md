# Add Basic/Advanced Tabs to KPI Upload Portal

## Goal
Reduce client overwhelm by introducing a **Basic** tab (default) showing only mandatory fields, alongside an **Advanced** tab containing the full existing layout. Data entered on either tab is shared, so switching tabs preserves input for the selected period.

## Implementation

### File: `src/pages/KpiUpload.tsx`
1. **Add Tabs UI** using existing `@/components/ui/tabs`:
   - Two triggers: **Basic** (default) and **Advanced**.
   - Tabs wrap the three KPI columns + Pawn Balance Grid + Aged Inventory Grid section.
   - Header, period selector, submit button, and confirmation dialogs remain outside the tabs (shared).

2. **Shared State**:
   - Both tabs read from and write to the same existing state (`pawnValues`, `merchandiseValues`, `marketingValues`, `pawnBalanceGrid`, `agedInventoryGrid`).
   - Switching tabs is purely a display filter — no data copying needed.

3. **Basic Tab Content**:
   - Filter each column's fields against `requiredFieldNames` from `useVisibleKpiFields()`:
     ```ts
     const basicPawn = pawnKpis.filter(f => requiredFieldNames.includes(f.name));
     const basicMerch = merchandiseKpis.filter(f => requiredFieldNames.includes(f.name));
     const basicMarketing = marketingKpis.filter(f => requiredFieldNames.includes(f.name));
     ```
   - Render `KpiInputColumn` for each, but hide any column whose filtered list is empty.
   - **Aged Inventory Grid**: Show only if `requiredAgedRows.length > 0`, and render only those rows (reuse existing grid component with a `visibleRows` prop, or conditionally render rows inside).
   - **Pawn Balance Grid**: Hidden in Basic mode (no per-cell mandatory flag exists today).
   - If Basic has zero required fields configured, show a friendly note: "No required fields configured. Switch to Advanced to enter data."

4. **Advanced Tab Content**:
   - Renders the existing layout exactly as it is today (no changes to behavior).

5. **Tab Persistence**:
   - Persist active tab in `localStorage` under key `kpi-upload-tab` (default `"basic"`).
   - Restore on mount.

6. **Submission**:
   - Submit button stays global (outside tabs).
   - Validation continues to check **all** required fields regardless of active tab.
   - If a required field is missing and the user is on Basic, the existing "missing fields" alert dialog already lists field labels — no change needed.

### File: `src/components/kpi/AgedInventoryGrid.tsx` (if separate component)
- Add an optional `visibleRows?: string[]` prop. When provided, only those row labels render. Default behavior unchanged.
- (If the grid is inlined in `KpiUpload.tsx`, apply the row filter directly there.)

## Out of Scope
- No DB schema changes.
- No changes to admin Field Visibility Manager or mandatory-field configuration.
- No changes to export logic or submission payload.
- Pawn Balance Grid remains Advanced-only until per-cell mandatory flags are introduced (future enhancement).

## Files to Edit
- `src/pages/KpiUpload.tsx` (primary)
- `src/components/kpi/AgedInventoryGrid.tsx` *(only if grid is a separate component — confirmed during implementation)*
