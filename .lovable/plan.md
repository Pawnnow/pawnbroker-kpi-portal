## Add `group`/`group_label` to CSV, fix currency column to use the user's selection, and stop emitting `metadata` rows

### What's wrong today
1. **No group info in the CSV.** Adding new groups in the future means the analyst has to maintain a separate user→group mapping or the analysis breaks.
2. **`currency` column is wrong.** We hardcoded `FG002 → CAD, everything else → USD`, but currency is actually a **user choice** persisted per period+location in `kpi_entries` as a `category="metadata"` row (`field_name="currency"`). The hardcoded rule will misreport any future user who picks CAD on a non-FG002 store, or USD on FG002.
3. **`metadata` rows leak into the CSV.** They show up as fake "entries" in the analyst's dataset.

### Goal
Each row in the CSV should carry, alongside the metric: `currency` (the value the user selected for that period+location), `group` (integer), and `group_label` (human label). `metadata` rows themselves should not appear in the CSV — they're the *source* of the currency column, not output rows.

## Changes

### 1. `src/hooks/useAdminKpiData.ts`
- Extend the `profiles` select to also pull `group`: `.select("id, email, user_name, group")`.
- Build `groupMap: Map<string, number>` alongside the existing maps.
- Build a **currency lookup**: walk `data` once, and for every row where `category === "metadata"` and `field_name === "currency"`, store its `field_value` in a `Map` keyed by `${user_id}|${location_id ?? ""}|${year}|${month}`. Default value if absent: `"USD"`.
- Extend `AdminKpiEntry` with `group?: number | null` and `currency?: string`.
- In `enrichedData.map`, attach `group: groupMap.get(entry.user_id) ?? 0` and `currency: currencyMap.get(key) ?? "USD"` to every entry. Keep metadata rows in the returned array — the CSV will filter them, but other consumers (admin grid views, etc.) may still rely on them being there.

### 2. `src/pages/AdminDashboard.tsx` — `handleDownloadBackup`
- Add `getGroupLabel` import from `@/lib/groupLabel`.
- New `csvHeaders` (insertion points kept tidy):
  ```
  user_id, user_email, group, group_label, year, month, category,
  field_name, field_label, field_value, location_id, store_code, store_name, currency
  ```
- Filter out metadata rows before building rows: `kpiData.filter(e => e.category !== "metadata")`.
- Row mapper:
  - `group_label` → `getGroupLabel(entry.group)`
  - `currency` → `entry.currency` (already attached by the hook; no more FG002 hardcode)
  - everything else → `String(entry[h] ?? "")` as today

### 3. No DB migration, no edge-function changes
- `kpi-export` already filters metadata out, so it's untouched.
- `admin-restore-data` will harmlessly ignore the new `group`/`group_label`/`currency` CSV columns on import (group lives on the user, currency lives on the metadata row that gets re-created on next submit). No restore changes needed.
- We are **not** removing the metadata writer in `KpiUpload.tsx`. It remains the source of truth for the per-period currency selection so the user's USD/CAD choice persists when reopening a period. We're just stopping it from leaking into the CSV.

### Out of scope
- Excel/Power Query exports (already correct — they filter metadata and emit currency as a column).
- Removing the currency dropdown on the upload page.
- Any UI for editing `group` (already exists in the admin user editor).

### Verification
1. Download a fresh CSV → `metadata` rows are gone; every remaining row has populated `currency`, `group`, `group_label` columns.
2. A row from an FG002 user who selected CAD shows `CAD`. A row from a non-FG002 user who selected CAD also shows `CAD` (proves we're using their selection, not the store rule).
3. A Founders user shows `1` / `Founders`; a Demo user shows `0` / `Demo`.
4. Re-import the CSV via the existing restore flow — succeeds, ignores the new columns, no errors.