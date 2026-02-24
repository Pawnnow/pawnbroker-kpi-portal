
# Multi-Location Support: Single Login with Store Switcher

## Overview
Allow one client login (single email/password) to upload data for multiple store locations. Each location gets its own unique `user_name` (e.g., F001, F002, F003) that appears in all data exports exactly as it does today for single-store users -- no changes to your Excel sheet required.

## How It Works

### For the Admin
1. Create a client account as usual (email, a "parent" username like "FranchiseCo", password, group)
2. Open a new "Manage Locations" section on the Admin Dashboard
3. Select the client, then add locations -- each with a unique store code (F001, F002) and a friendly name ("Downtown Store")
4. The store codes are stored so that exports output them as `user_name`

### For the Client
1. Log in with their single email/password
2. A "Select Store" dropdown appears at the top of the KPI Upload page (only if they have locations assigned)
3. Pick a store (e.g., "F001 - Downtown Store"), select year/month, and enter data
4. Submit -- data is tagged to that specific location
5. Switch stores via the dropdown to enter data for the next location

### For Exports
- The API export and Excel export will output the location's store code as `user_name` -- identical to how single-store users work today
- Your existing Excel sheet needs zero changes

## Database Changes

### New Table: `locations`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK to profiles) | The parent account |
| store_code | text (unique) | e.g., F001 -- exported as `user_name` |
| store_name | text | Friendly name, e.g., "Downtown Store" |
| is_active | boolean | Default true |
| created_at | timestamptz | Auto-set |

### Modify `kpi_entries`
- Add nullable `location_id` column (uuid, FK to locations)
- Existing single-store data remains unaffected (location_id = null)
- Update the upsert unique constraint from `(user_id, year, month, field_name)` to `(user_id, COALESCE(location_id, '00000000-...'), year, month, field_name)` so the same user can submit data for different stores in the same month

### RLS Policies on `locations`
- Users can SELECT their own locations (where user_id = auth.uid())
- Admins can SELECT all locations
- Admins can INSERT, UPDATE, DELETE locations

## New Files

### `src/hooks/useUserLocations.ts`
- Fetches active locations for the logged-in user
- Returns the list of locations and a loading state
- Used by KpiUpload to show/hide the store selector

### `src/components/admin/LocationManager.tsx`
- Admin UI card for managing locations
- Select a user from a dropdown, see their locations listed
- "Add Location" form with store code and store name fields
- Edit/deactivate existing locations
- Store code validated for uniqueness

## Modified Files

### `src/pages/KpiUpload.tsx`
- Import and use `useUserLocations` hook
- If locations exist, show a "Select Store" dropdown above year/month
- Store selection is required before data entry (if locations exist)
- Include `location_id` in every KPI entry on submit
- Update the upsert conflict columns to include location_id

### `src/pages/AdminDashboard.tsx`
- Add the LocationManager component below user management
- Add a store code filter to the data table

### `src/hooks/useAdminKpiData.ts`
- Join the `locations` table to include `store_code` and `store_name`
- When a location exists, use `store_code` as the display identifier (in place of or alongside user_name)

### `supabase/functions/kpi-export/index.ts`
- Join `locations` table
- When a KPI entry has a `location_id`, output the location's `store_code` as `user_name` in both long and wide formats
- When no `location_id` (single-store user), continue using the profile's `user_name` as today
- Add optional `store_code` query parameter for filtering

### `src/components/admin/CreateUserForm.tsx`
- No changes needed -- locations are managed separately after account creation

## Technical Details

### Export Compatibility (the key requirement)
The export currently outputs `user_name` from the `profiles` table. With this change:

```text
Single-store user (no locations):
  user_name = profiles.user_name  (unchanged)

Multi-location user (has locations):
  user_name = locations.store_code  (F001, F002, etc.)
```

This means your Excel sheet sees `user_name` = "F001" for one store and `user_name` = "F002" for another, exactly as if they were separate accounts.

### Upsert Logic Update
Current unique constraint: `(user_id, year, month, field_name)`

New approach uses a unique index with COALESCE to handle nullable location_id:
```text
CREATE UNIQUE INDEX ON kpi_entries (
  user_id, 
  COALESCE(location_id, '00000000-0000-0000-0000-000000000000'), 
  year, month, field_name
);
```
This allows:
- User A, no location, Jan 2025 -- works as before
- User A, location F001, Jan 2025 -- separate entry
- User A, location F002, Jan 2025 -- separate entry

### Migration Summary
1. Create `locations` table with RLS policies
2. Add `location_id` column to `kpi_entries` (nullable)
3. Drop old unique constraint on kpi_entries
4. Create new unique index with COALESCE for location_id
5. Add foreign key from kpi_entries.location_id to locations.id
