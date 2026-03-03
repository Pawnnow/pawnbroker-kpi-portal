
# Add Location Fields to CSV Backup

## Problem
The CSV backup export does not include any location information. Since multiple locations share the same `user_id`, there is no way to distinguish which KPI entries belong to which store in the backup file. This also means restoring from a backup cannot properly re-associate data with the correct location.

## Changes

### 1. Update CSV backup download (`src/pages/AdminDashboard.tsx`)
- Add `location_id`, `store_code`, and `store_name` to the `csvHeaders` array
- These fields are already available on each entry from `useAdminKpiData` -- no additional data fetching needed

### 2. Update CSV restore function (`supabase/functions/admin-restore-data/index.ts`)
- Add `location_id` to the parsed CSV fields so that restored data is associated with the correct location
- Keep `location_id` optional (null) for backward compatibility with older backups that lack the column

## Result
Backup CSVs will contain columns like:
```
user_id, user_email, year, month, category, field_name, field_label, field_value, location_id, store_code, store_name
```
The restore function will use `location_id` when present, preserving multi-location data integrity through backup/restore cycles.
