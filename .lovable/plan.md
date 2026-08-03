# Fix: previously entered data not visible in My Entries

## What's happening

Martin's data is in the database — 22 fields for March 2026 — but every one of those rows has no store attached to it (blank store reference). He now has one store on his account (FG002), so the My Entries tab filters by that store and finds nothing.

This isn't operator error, and it isn't only Martin. Three accounts are affected:

| Account | Name | Orphaned entries |
| --- | --- | --- |
| FG009 | Michael Hill | 176 |
| FG010 | Jeremy Powell | 160 |
| FG002 | Martin Strasser | 22 |

All three submitted their data before a store record existed on their account. When default store records were later created for accounts missing one, the older entries were left unlinked, so the dashboard's store filter hides them.

## The fix

1. **Backfill the existing data.** For any account that has exactly one store, attach all of its unlinked entries to that store. This makes the three accounts above see their history again immediately. Accounts with multiple stores are not touched (there'd be no safe way to guess which store an entry belongs to) — none currently have orphaned entries.

2. **Prevent a repeat.** In the My Entries tab, when an account has exactly one store, also include entries that have no store attached, so nothing can ever silently disappear again for single-store users.

## Technical details

- Migration: `UPDATE public.kpi_entries e SET location_id = l.id FROM public.locations l WHERE e.location_id IS NULL AND l.user_id = e.user_id AND (SELECT count(*) FROM public.locations l2 WHERE l2.user_id = e.user_id) = 1;`
- `src/pages/ClientDashboard.tsx` `fetchEntries()`: when `locations.length === 1`, replace `.eq("location_id", selectedLocationId)` with `.or("location_id.eq.<id>,location_id.is.null")`. Multi-store behavior unchanged.
- Note: with the unique index on `(user_id, location_id, year, month, field_name)` using `NULLS NOT DISTINCT`, the backfill cannot create duplicates for these accounts since none of them have store-linked rows for the same periods.
