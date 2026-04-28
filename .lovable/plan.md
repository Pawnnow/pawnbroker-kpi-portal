## Reorganize KPI Upload into 4 admin-configurable columns

### Goal
Replace the current 3 fixed columns (Pawn KPIs / Merchandise KPIs / Marketing KPIs) on the KPI Upload page with **4 columns**:

1. **Pawn Performance**
2. **Merchandise Performance**
3. **Financial Summary**
4. **Customer & Marketing**

The Field Visibility Manager in the Admin Dashboard will be expanded so admins can pick which **column** each field belongs to (in addition to the existing Visible / Required toggles).

### Behavior

**Upload page (`/kpi-upload`)**
- The Pawn / Merchandise / Marketing columns are replaced by the four new columns above, rendered left-to-right in that order on desktop and stacked on mobile (same responsive pattern as today).
- Each field appears in whichever column the admin assigned. Fields with no assignment fall back to a sensible default (see "Defaults" below) so nothing disappears on first load.
- The Basic / Advanced tab behavior, info bubbles, currency formatting, validation, draft auto-save, and aged-inventory / pawn-balance grids are unchanged. Aged Inventory and Pawn Balance grids continue to render full-width below the four columns.

**Admin Dashboard → Field Visibility Manager**
- Each KPI field row gains a **Column** dropdown next to the Visible / Required switches with the four options: Pawn Performance, Merchandise Performance, Financial Summary, Customer & Marketing.
- The page is regrouped by the new column assignment instead of the legacy pawn/merchandise/marketing categories. The grid-related sections (Aged Inventory Columns, Pawn Balance Breakdown, Aged Inventory Rows) remain in their own sections — they aren't column-assignable.
- Changing a field's column updates immediately on the upload page (already wired through React Query cache).

### Defaults (initial column assignment)

A one-time SQL seed assigns every existing KPI field to one of the four new columns. Suggested mapping (admin can change any of these later in one click):

**Pawn Performance**
- Ending Pawn Balance, # of Pawns at End of Month, # Pawns Written, $ Pawns Written, # Pawns Redeemed, $ Pawns Redeemed, # Pawns Defaulted, $ Pawns Defaulted, PSC Collected, # Pawns Renewed, $ Pawns Renewed, # Active Pawns

**Merchandise Performance**
- Layaway Balance, # Active Layaways, # New Layaways Written, $ New Layaways Written, # Redeemed Layaways, $ Redeemed Layaways, # Sales Transactions, Retail Sales, Scrap Sales, # Buys, $ Buys, Merch. Inventory, Buy Inventory, Layaway Inventory, Scrap Inventory

**Financial Summary**
- Gross Sales, COGS, Gross Profits, COGS for Scrap, Monthly Expenses, Net Profit

**Customer & Marketing**
- Text Marketing, Social Media Ads (FB & Google), Print Marketing, Radio Marketing, TV Marketing, Website, Consulting, Total Marketing Spent, # Google Reviews, # Pawn Customers, Unique Pawn Customers, # Buy Customers, # Retail Customers, Customer Traffic, New Customers, Unique Customers, Unique Customers (365 Days)

### Implementation steps

1. **Database — `kpi_field_config` schema migration**
   - Add column `column_group text not null default 'pawn_performance'` with a CHECK constraint allowing: `pawn_performance`, `merchandise_performance`, `financial_summary`, `customer_marketing`.
   - Backfill `column_group` for all existing rows per the defaults above. Grid-related rows (`aged_inventory`, `aged_inventory_row`, `pawn_balance`) keep the default value but are ignored by the upload UI.

2. **Hook — `src/hooks/useKpiFieldConfig.ts`**
   - Include `column_group` in the typed result.
   - Add a new helper `kpisByColumn` that returns four arrays (`pawnPerformance`, `merchandisePerformance`, `financialSummary`, `customerMarketing`) of `{ name, label, isRequired }`, sorted by `display_order`. Only includes visible KPI fields (excludes grid categories).

3. **Upload page — `src/pages/KpiUpload.tsx`**
   - Replace the three `KpiInputColumn` blocks with a 4-column grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-4`) using the new helper.
   - Build a single source-of-truth map `fieldNameToCategory` so the existing submit logic can still tag each entry's `category` correctly (kept as `pawn` / `merchandise` / `marketing` in the DB so historical exports, dashboards, and Power Query are unaffected). The UI column is a *display* concept only.
   - Update Basic-tab filtering to operate on the four new column arrays.

4. **Admin UI — `src/components/admin/FieldVisibilityManager.tsx`**
   - For every field row (excluding grid sections), render a compact `Select` bound to `column_group`. On change, persist via `supabase.from('kpi_field_config').update({ column_group }).eq(...)` and update the React Query cache.
   - Regroup the visible KPI list by `column_group` under the four new headers; keep the three grid sections as-is below.

5. **Storage & exports**
   - No change to the `category` field in `kpi_entries`, so existing dashboards, Excel export, and Power Query continue working without migration.

### Out of scope
- No changes to the dashboard view layout, exports, or grids.
- No renaming or removal of any KPI field.
- No migration of historical `kpi_entries` data.
