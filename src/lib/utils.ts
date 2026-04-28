import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Currency formatting for KPI fields ---

export const CURRENCY_FIELDS = new Set([
  // Pawn KPIs
  "ending_pawn_balance",
  "dollar_pawns_written",
  "dollar_pawns_redeemed",
  "dollar_pawns_defaulted",
  "dollar_pawns_renewed_30d",
  "dollar_buys_30d",
  // Merchandise KPIs
  "layaway_balance",
  "dollar_new_layaways",
  "dollar_redeemed_layaways",
  "retail_sales",
  "gross_sales",
  "cogs",
  "gross_profits",
  "scrap_sales",
  "cogs_scrap",
  "merch_inventory",
  "buy_inventory",
  "layaway_inventory",
  "scrap_inventory",
  "monthly_expenses",
  "net_profit",
  // Marketing KPIs (everything above # Google Reviews)
  "marketing_text",
  "marketing_social_media",
  "marketing_print",
  "marketing_radio",
  "marketing_tv",
  "marketing_website",
  "marketing_consulting",
  "total_marketing_spent",
  // UI-only proxy field for the basic-view "$ Inventory 365+ Days" input.
  // Reads/writes the same value as the Aged Inventory grid 365+ Days / Total $ cell.
  "aged_365_proxy",
]);

/** Check if a grid cell field key should be currency-formatted */
export function isGridCurrencyField(fieldKey: string): boolean {
  // Aged inventory grid: ALL cells are currency
  if (fieldKey.startsWith("aged_")) return true;
  // Pawn balance grid: only the "$" (Dollar) column
  if (fieldKey.startsWith("pawn_balance_") && fieldKey.endsWith("_Dollar")) return true;
  return false;
}

/** Check if any field (KPI or grid) is a currency field */
export function isCurrencyField(fieldName: string): boolean {
  return CURRENCY_FIELDS.has(fieldName) || isGridCurrencyField(fieldName);
}

/** Format a numeric string as $X,XXX.00 for display */
export function formatAsCurrency(value: string | null | undefined): string {
  if (!value || value === "" || value === "-") return "—";
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Normalize a numeric string to always have 2 decimal places for storage */
export function normalizeCurrencyValue(value: string): string {
  if (!value || value.trim() === "") return value;
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toFixed(2);
}
