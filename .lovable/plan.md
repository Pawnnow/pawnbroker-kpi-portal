

# Build Client Dashboard with Editable KPI Table

## Problem
The `/dashboard` route currently shows the old chart-based `KpiDashboard` wrapped in `AdminRoute`. The planned client-facing dashboard where users can review, inline-edit, and delete their own KPI entries was never implemented.

## Changes

### 1. Create new page `src/pages/ClientDashboard.tsx`
- Month/year selector and location selector (reuse existing `MonthSelector` and location hooks)
- Fetch the logged-in user's `kpi_entries` filtered by selected month, year, and location
- Render entries in an editable table (field label, field value) grouped by category
- Inline edit: clicking a value makes it editable; on blur/enter, upsert the change via Supabase
- Delete button per row to remove individual entries
- Header with navigation back to `/kpi-upload` and logout

### 2. Update routing in `src/App.tsx`
- Change `/dashboard` route from `AdminRoute` → `ProtectedRoute` wrapping the new `ClientDashboard`
- The old chart-based `KpiDashboard` can remain accessible at a different admin-only route (e.g. `/admin/charts`) or be removed entirely depending on preference
- Add a nav link to the client dashboard from the KPI upload page

### 3. Add navigation link in `src/pages/KpiUpload.tsx`
- Add a "My Entries" or "Dashboard" button in the header linking to `/dashboard`

## Result
Clients will see a table of their submitted KPIs at `/dashboard`, with the ability to filter by month/year/location, edit values inline, and delete entries. The old chart view will no longer be shown to regular users.

