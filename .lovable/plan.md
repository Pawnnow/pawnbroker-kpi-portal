

# Remove Session Timeout + Add Auto-Save for KPI Data Entry

## Overview
We'll remove the inactivity timeout entirely so users are never logged out due to inactivity. As a safety net, we'll also add auto-save functionality to the KPI upload page so users never lose their work.

## Changes

### 1. Remove the activity timeout entirely
- Delete the `useActivityTimeout` hook usage from `ProtectedRoute.tsx`
- Remove or keep the `src/hooks/useActivityTimeout.ts` file (can be deleted since it won't be used)
- Users will stay logged in until they manually log out or their session token expires naturally

### 2. Add auto-save to KPI Upload page
As a safety net (e.g., browser crash, accidental tab close), save form inputs to the browser's local storage as the user types:
- Store draft values in `localStorage` keyed by user ID + month + year + location
- Restore drafts automatically when the user returns to the upload page
- Clear the draft after a successful submission
- Show a small indicator ("Draft saved") so users know their work is preserved

## Technical Details

**Files to modify:**
- `src/components/ProtectedRoute.tsx` -- remove the `useActivityTimeout` import and hook call
- `src/pages/KpiUpload.tsx` -- add auto-save logic using `localStorage`

**Files to delete (optional cleanup):**
- `src/hooks/useActivityTimeout.ts` -- no longer needed

**Auto-save key format:**
`kpi-draft-{userId}-{year}-{month}-{locationId}`

This stores the current form values as JSON. On page load, if a matching draft exists, the values are restored and a toast notifies the user ("Draft restored").

