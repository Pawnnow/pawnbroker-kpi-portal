

# Diagnosis: Why Members Can't Submit KPI Data

## Findings

After investigating the database, auth logs, RLS policies, and upload code, there is **no single code bug** preventing submissions. The system works (Matt just submitted 18 entries, Bob has 1,434). The problem is a combination of UX friction and account state issues:

### Issue 1: Five users are locked on the Change Password screen
These users have `must_change_password = true` and **cannot reach the upload page at all** until they change their password. They may not realize this or may be confused by the redirect:
- Carli Karlson (FG004)
- Mark Daily (FG005)
- Richard Dan (FG001)
- Rob Barnett (FG006)
- William Burkhalter (FG007)

### Issue 2: 19 required fields silently block submission
Users must fill **all 19 required fields** across pawn, merchandise, marketing, and aged inventory categories before the form will submit. If any are missing, a dialog pops up listing them, but the form doesn't submit. Users may dismiss the dialog and assume their data saved (especially since the draft auto-save shows "Draft saved" in the UI, which could be confused with actual submission).

### Issue 3: No persistent submission confirmation
Success feedback is only a toast notification that disappears after a few seconds. Combined with auto-draft saving, users have no lasting confirmation that data was actually submitted to the database.

## Proposed Changes

### 1. Add prominent submission logging and feedback
In `src/pages/KpiUpload.tsx`:
- Add `console.log` statements at each step of `handleSubmit` (before delete, after delete, before insert, after insert) for debugging
- Replace the success toast with a **persistent success banner** that stays visible until dismissed
- Show a persistent error banner on failure instead of just a toast
- Stop calling `handleClear()` immediately after success — keep the form populated so users can see what was saved

### 2. Improve required fields UX
In `src/pages/KpiUpload.tsx`:
- Add red asterisks next to required field labels before submission attempt
- Make the "Missing Required Fields" dialog more prominent with a clear message: "Your data has NOT been saved yet"
- Add a count badge showing "X of Y required fields filled" near the submit button

### 3. Differentiate draft vs. submission status
- Change the "Draft saved" indicator to clearly say "Saved locally (not submitted)" to avoid confusion with database submission
- Add a "Last submitted" timestamp that queries the database for the user's most recent entry for the selected month/year

## Technical Scope
- Only `src/pages/KpiUpload.tsx` needs modification
- No database or RLS changes required
- No new tables or edge functions needed

