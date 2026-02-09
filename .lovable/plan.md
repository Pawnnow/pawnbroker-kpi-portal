

# Update Plan Summary

This plan covers four changes: one client-side cleanup, one new admin feature, one field reordering fix, and one admin UI improvement.

---

## 1. Remove Excel Integration from Client Upload Page

Remove the Excel Integration component from the KPI Upload page so regular users no longer see it. It remains on the Admin Dashboard.

**File:** `src/pages/KpiUpload.tsx`
- Remove the `ExcelIntegration` import
- Remove the `<ExcelIntegration />` usage from the page

---

## 2. CSV Backup and Restore (Admin Dashboard)

Add disaster recovery capability so admins can download all KPI data as a CSV and restore from a CSV if needed.

### Backup (Download CSV)
- Add a "Download Backup" button to the Admin Dashboard's Data Management section
- Fetch all `kpi_entries` via the existing admin data hook (with pagination to avoid row limits)
- Generate and download a CSV containing: `user_id`, `user_email`, `year`, `month`, `category`, `field_name`, `field_label`, `field_value`

### Restore (Upload CSV)
- Add an "Upload Restore" button with file input
- Create a new edge function `admin-restore-data` that:
  - Validates the admin role
  - Parses the CSV
  - Upserts records into `kpi_entries` (matching on `user_id`, `year`, `month`, `field_name`) to avoid duplicates
- Show progress/result feedback via toast notifications

**Files:**
- `src/pages/AdminDashboard.tsx` -- add backup/restore UI
- `supabase/functions/admin-restore-data/index.ts` -- new edge function for CSV restore

---

## 3. Reorder KPI Fields on Upload Page

Ensure count (#) fields always appear before dollar ($) fields, and swap the Pawn Balance grid columns so QTY comes before $.

**File:** `src/pages/KpiUpload.tsx`
- Swap field order for all paired KPIs (Pawns Written, Pawns Redeemed, Pawns Defaulted, New Layaways Written, Redeemed Layaways) so `#` precedes `$`
- Change the Pawn Balance grid column order from `["$", "QTY"]` to `["QTY", "$"]`

---

## 4. Expandable User List on Admin Dashboard

Add a pop-out button to the Existing Users card that opens the full user list in a large dialog/modal for easier viewing.

**Files:**
- `src/components/admin/UserList.tsx` -- add a maximize/expand button to the card header that opens a full-screen `Dialog` containing the user table with more room to view and manage users

---

## Implementation Order

1. Field reordering (Update 3) -- simple, no backend changes
2. Remove Excel Integration (Update 1) -- simple removal
3. Expandable User List (Update 4) -- UI-only change
4. CSV Backup & Restore (Update 2) -- largest change, includes new edge function

