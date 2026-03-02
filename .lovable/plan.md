

# Sync Export Schema with Upload Form Fields

## Problem
The `ALL_KPI_COLUMNS` array in the `kpi-export` Edge Function is outdated and missing many fields that exist in the upload form. In wide format, missing fields won't appear as placeholder columns, making Excel PivotTables inconsistent.

**Current ALL_KPI_COLUMNS has 33 entries. The upload form has 51+ individual fields plus grid data.**

## Key Mismatches Found

| Issue | Example |
|-------|---------|
| Wrong names | Export has "Num Pawns Forfeited" but form uses "Num Pawns Defaulted" |
| Missing "of" | Export has "Num Pawns at End of Month", form label produces "Num of Pawns at End of Month" |
| Missing fields | PSC Collected, all Renewed/Buys fields, Active Pawns, Pawn Customers, Unique Pawn Customers |
| Missing merch fields | Layaway Balance, Active Layaways, New Layaways, Redeemed Layaways, Sales Transactions, Gross Sales, COGS, Gross Profits, Scrap Sales, COGS for Scrap, Monthly Expenses, Net Profit, Buy Inventory |
| Missing marketing fields | Google Reviews, Buy Customers, Retail Customers, Customer Traffic, New Customers, Unique Customers (30d + 365d) |
| Old pawn fields still listed | "Dollar Pickups", "Num Pickups", "Dollar Extensions", "Dollar Renewals" -- no longer in the upload form |

## Solution
Replace `ALL_KPI_COLUMNS` in `supabase/functions/kpi-export/index.ts` with the correct list derived from the upload form labels after the `$` to `Dollar` and `#` to `Num` conversion (and stripping parentheses/special chars).

### Corrected column list (51 fields):

**Pawn KPIs (16):**
Ending Pawn Balance, Num of Pawns at End of Month, Num Pawns Written, Dollar Pawns Written, Num Pawns Redeemed, Dollar Pawns Redeemed, Num Pawns Defaulted, Dollar Pawns Defaulted, PSC Collected, Num Pawns Renewed Past 30 Days, Dollar Pawns Renewed Past 30 Days, Num Buys Past 30 Days, Dollar Buys Past 30 Days, Num Active Pawns, Num Pawn Customers, Unique Pawn Customers

**Merchandise KPIs (19):**
Layaway Balance, Num Active Layaways, Num New Layaways Written, Dollar New Layaways Written, Num Redeemed Layaways, Dollar Redeemed Layaways, Num Sales Transactions Past 30 Days, Retail Sales, Gross Sales, COGS, Gross Profits, Scrap Sales, COGS for Scrap, Monthly Expenses, Net Profit, Merch Inventory, Buy Inventory, Layaway Inventory, Scrap Inventory

**Marketing KPIs (15):**
Text Marketing, Social Media Ads FB  Google, Print Marketing, Radio Marketing, TV Marketing, Website, Consulting, Total Marketing Spent, Num Google Reviews, Num Buy Customers, Num Retail Customers, Customer Traffic Through Door, New Customers Past 30 Days, Unique Customers Past 30 Days, Unique Customers Past 365 Days

Note: Grid fields (Aged Inventory and Pawn Balance) are not included in this array since they use a different key format and are already handled dynamically.

## Changes

### 1. `supabase/functions/kpi-export/index.ts`
- Replace the entire `ALL_KPI_COLUMNS` array with the corrected 51-field list above
- Redeploy the edge function

## Impact
- Wide format exports will now show all 51 KPI columns consistently, even when some have no data
- Existing Excel dashboards using AVERAGEIFS/PivotTables may need column reference updates if they relied on the old (incorrect) column names
- No database changes needed

