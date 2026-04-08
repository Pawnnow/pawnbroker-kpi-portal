

## Summary of All Updates

1. **Currency Selector (USD/CAD)** on the KPI Upload page — a simple dropdown defaulting to USD, placed to the left of the store selector. Single-store users see only the currency dropdown; multi-location users see both. The selected currency is included as a metadata entry when data is submitted.

2. **Backfill existing data with USD** — a one-time database migration that inserts a `currency` metadata row (value "USD") for every unique user/year/month/location combination already in `kpi_entries`.

---

## Technical Details

### 1. `src/pages/KpiUpload.tsx`

- Add `currency` state defaulting to `"USD"`
- Add a currency selector card that **always** renders (not gated by `hasLocations`), placed before the store selector in the layout. When user has locations, both selectors appear side-by-side in a single card row; when no locations, only the currency selector shows.
- On submit (`executeSubmit`), add a currency entry to the entries array:
  ```ts
  { field_name: "currency", field_label: "Currency", field_value: currency, category: "metadata" }
  ```
- Also delete the old `currency` field_name entry before re-inserting (already handled by the existing delete-then-insert logic, just need to ensure "currency" is in the fieldNames list)
- Include `currency` in draft save/restore logic
- When loading existing data for a period, check for an existing currency entry and pre-select it

### 2. Database Migration (backfill)

```sql
INSERT INTO kpi_entries (user_id, year, month, location_id, field_name, field_label, field_value, category)
SELECT DISTINCT user_id, year, month, location_id, 'currency', 'Currency', 'USD', 'metadata'
FROM kpi_entries
WHERE NOT EXISTS (
  SELECT 1 FROM kpi_entries e2
  WHERE e2.user_id = kpi_entries.user_id
    AND e2.year = kpi_entries.year
    AND e2.month = kpi_entries.month
    AND e2.location_id IS NOT DISTINCT FROM kpi_entries.location_id
    AND e2.field_name = 'currency'
);
```

### 3. Export function (`supabase/functions/kpi-export/index.ts`)

Add "Currency" as a column in the export output so admins can see which currency was used per submission.

### No schema changes needed

The existing `kpi_entries` table supports arbitrary field names. No new tables or columns required.

