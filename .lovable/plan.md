

## Remove "(Past 30 Days)" and "(Past 365 Days)" from KPI Labels

Three files need updating to strip the parenthetical time-period suffixes from field labels:

### 1. `src/pages/KpiUpload.tsx`
Remove `(Past 30 Days)` and `(Past 365 Days)` from the `label` values in the hardcoded field arrays. Affected labels:
- `# Pawns Renewed (Past 30 Days)` → `# Pawns Renewed`
- `$ Pawns Renewed (Past 30 Days)` → `$ Pawns Renewed`
- `# Buys (Past 30 Days)` → `# Buys`
- `$ Buys (Past 30 Days)` → `$ Buys`
- `# Sales Transactions (Past 30 Days)` → `# Sales Transactions`
- `New Customers (Past 30 Days)` → `New Customers`
- `Unique Customers (Past 30 Days)` → `Unique Customers`
- `Unique Customers (Past 365 Days)` → `Unique Customers (365)`

Note: The two "Unique Customers" labels will need differentiation — will use "Unique Customers" and "Unique Customers (365 Days)" to keep them distinguishable.

### 2. Database migration
Update `kpi_field_config` table labels to match, using:
```sql
UPDATE kpi_field_config SET field_label = '# Pawns Renewed' WHERE field_name = 'num_pawns_renewed_30d';
-- (same pattern for all affected rows)
```

### 3. `supabase/functions/kpi-export/index.ts`
Update the export column headers to match the shortened labels.

No changes to field_name values or any other logic — purely cosmetic label updates.

