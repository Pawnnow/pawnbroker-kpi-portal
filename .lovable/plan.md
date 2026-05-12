## Diagnosis: this is (mostly) a real bug, not operator error

### What the user is seeing
On **My Dashboard → My Entries**, previously-uploaded values render as `—` (no entry found) even though the data exists in the database.

### Root cause
The recent Basic/Advanced split did **not** touch `ClientDashboard.tsx` — but it did expose a pre-existing race condition in how that page fetches entries. The bug:

`src/pages/ClientDashboard.tsx` builds its DB query like this:

```ts
let query = supabase.from("kpi_entries")...
if (hasLocations && selectedLocationId) {
  query = query.eq("location_id", selectedLocationId);
} else if (!hasLocations) {
  query = query.is("location_id", null);  // ← problem
}
```

…and the effect that calls it has dependencies `[year, month, selectedLocationId]` — **`hasLocations` is missing**.

`hasLocations` comes from `useUserLocations()` (React Query, async). On first render its data is `undefined`, so `hasLocations === false`. The effect fires immediately and runs the query with `location_id IS NULL`, which returns **zero rows** for any user whose entries all have a `location_id` (i.e., every multi-store user — confirmed in DB: 2 of the active users have multiple locations and 2,300 of 2,480 rows have a non-null `location_id`).

When `useUserLocations` resolves a moment later, `hasLocations` flips to `true`, but **nothing re-triggers the effect** because `hasLocations` isn't in the deps and `selectedLocationId` is still `""`. The user is stuck on an empty grid until they manually open the Store dropdown and pick one — at which point everything appears.

### Why this looked like a regression after Basic/Advanced
The split didn't change ClientDashboard's logic, but it did add work to `useKpiFieldConfig` and the upload page that re-renders things slightly differently. The race was always there; it's just biting more consistently now. (Also: `KpiUpload`'s submit was reworded to only delete `field_name`s it's about to insert, so re-submits from the Basic tab are safe and don't wipe Advanced fields — that part is fine.)

## Plan

### 1. `src/pages/ClientDashboard.tsx` — fix the race
Two small, targeted changes:

- **Wait for locations to load before fetching.** Pull `isLoading: locationsLoading` out of `useUserLocations()` and short-circuit `fetchEntries` while it's still loading. Add `locationsLoading` and `hasLocations` to the effect's dependency array so the fetch re-runs once locations resolve.
- **Auto-select the first store.** Once `locations` arrives, if `hasLocations && !selectedLocationId`, default `selectedLocationId` to `locations[0].id`. This matches what KpiUpload effectively expects and prevents the "no store picked → mixed data" foot-gun.

After this, multi-store users land on My Entries with their first store preselected and entries loaded; single-location users are unaffected.

### 2. (Optional, recommended) tighten the query
While we're in there, change the `else if (!hasLocations)` branch so that when the user *does* have locations but somehow still has no `selectedLocationId`, we don't fall through to the `location_id IS NULL` filter at all — just skip running the query. Belt-and-suspenders against the same class of bug.

### 3. No DB / RLS / schema changes
Data is intact in `kpi_entries`. RLS already allows users to read their own rows. This is purely a frontend timing fix.

### Out of scope
- No changes to KpiUpload, the Basic/Advanced split, the column-group migration, or the inline-edit save logic (`handleSave` works correctly when an entry is found — the bug is upstream, in fetching).
- No data migration needed.

### Verification
1. Log in as a multi-store user → land on My Entries → values should render immediately for the first store, with the dropdown showing it preselected.
2. Switch store → values update.
3. Switch month/year → fetch re-runs.
4. Inline pencil-edit on any populated field → saves and persists after refresh.
5. Single-location user → unchanged behavior.