
# KPI Field Visibility Toggle System

## Overview
Add an admin-controlled toggle system that lets you show/hide individual KPI fields on the Upload page. Hidden fields stay in the code and can be re-enabled anytime. Exports are unaffected.

## Implementation Steps

### Step 1: Database -- Create `kpi_field_config` table

Create a new table to store visibility settings for each KPI field:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid (PK) | Auto-generated |
| `field_name` | text (unique) | Matches KPI field name |
| `category` | text | pawn, merchandise, marketing, aged_inventory, pawn_balance |
| `field_label` | text | Human-readable label for the admin UI |
| `is_visible` | boolean, default true | Toggle on/off |
| `display_order` | integer | Preserve field ordering |
| `updated_at` | timestamptz | Last change timestamp |

- Seed all current fields (50+) as visible by default
- RLS: authenticated users can SELECT; admins can UPDATE
- Aged Inventory and Pawn Balance grids get one row each as grid-level toggles (simpler than per-cell toggles)

### Step 2: Create a custom hook -- `useKpiFieldConfig`

New file `src/hooks/useKpiFieldConfig.ts`:
- Fetches all rows from `kpi_field_config`
- Returns filtered arrays for each category (only visible fields)
- Returns grid visibility booleans for aged_inventory and pawn_balance
- Uses TanStack Query for caching

### Step 3: Update KPI Upload Page

Modify `src/pages/KpiUpload.tsx`:
- Use the new hook to get visible field lists
- Pass filtered arrays to `KpiInputColumn` components instead of the full constants
- Conditionally render each column only if it has visible fields
- Conditionally render grids based on grid-level visibility
- The existing `grid-cols-1 lg:grid-cols-3` layout will naturally adapt (collapse to 2 or 1 columns)

### Step 4: Admin Dashboard -- Field Visibility Manager

Add a new section to `src/pages/AdminDashboard.tsx` (or a dedicated component):
- Grouped by category with expandable sections
- Switch/toggle next to each field label
- "Toggle All" per category for bulk changes
- Changes save immediately on toggle via Supabase update
- For grids, a single toggle to show/hide the entire grid

### Step 5: Verify Export Is Unaffected

- The export logic in `KpiUpload.tsx` and the `kpi-export` edge function query `kpi_entries` directly
- No changes needed -- hidden fields simply won't have new data, but historical values remain exportable

## Files Changed

| File | Change |
|------|--------|
| Database migration | New `kpi_field_config` table + seed data + RLS |
| `src/hooks/useKpiFieldConfig.ts` | New hook to fetch and filter field config |
| `src/pages/KpiUpload.tsx` | Use hook to filter displayed fields and grids |
| `src/pages/AdminDashboard.tsx` | Add Field Visibility management UI |
| New component (e.g. `src/components/admin/FieldVisibilityManager.tsx`) | Toggle UI grouped by category |
