export type LineKind = "input" | "calc" | "header";
export type LineSection = "income" | "expenses" | "pawn";

export interface BudgetLine {
  key: string;
  label: string;
  section: LineSection;
  kind: LineKind;
  /** Renameable by the user (custom slots) */
  renameable?: boolean;
  /** Bold total row */
  emphasis?: boolean;
  /** KPI field_name this line pre-fills from */
  kpiField?: string;
}

export const INCOME_LINES: BudgetLine[] = [
  { key: "retail_in_store", label: "Retail Sales - In Store", section: "income", kind: "input", kpiField: "retail_sales" },
  { key: "retail_online", label: "Retail Sales - Online", section: "income", kind: "input" },
  { key: "total_retail_sales", label: "Total Retail Sales", section: "income", kind: "calc" },
  { key: "cogs", label: "Cost of Goods Sold (COGS)", section: "income", kind: "input", kpiField: "retail_cogs" },
  { key: "gross_profit", label: "Gross Profit", section: "income", kind: "calc" },
  { key: "psc_collected", label: "Pawn Service Charges (PSC) Collected", section: "income", kind: "input", kpiField: "psc_collected" },
  { key: "tax_exempt_scrap", label: "Tax Exempt Sales - Scrap Metal", section: "income", kind: "input", kpiField: "scrap_sales" },
  { key: "tax_exempt_other", label: "Tax Exempt Sales - Other", section: "income", kind: "input" },
  { key: "total_tax_exempt", label: "Total Tax Exempt Sales", section: "income", kind: "calc" },
  { key: "misc_income", label: "Misc Income", section: "income", kind: "input", kpiField: "misc_income" },
  { key: "custom_income_1", label: "Custom Income 1", section: "income", kind: "input", renameable: true, kpiField: "custom_income_1" },
  { key: "custom_income_2", label: "Custom Income 2", section: "income", kind: "input", renameable: true, kpiField: "custom_income_2" },
  { key: "custom_income_3", label: "Custom Income 3", section: "income", kind: "input", renameable: true, kpiField: "custom_income_3" },
  { key: "total_income", label: "TOTAL INCOME", section: "income", kind: "calc", emphasis: true },
];

const EXPENSE_SIMPLE: Array<[string, string, string?]> = [
  ["exec_wages", "Executive Wages", "exec_wages"],
  ["staff_wages", "Staff Wages", "staff_wages"],
  ["medical_insurance", "Medical Insurance", "medical_insurance"],
  ["liability_insurance", "Liability Insurance", "liability_insurance"],
  ["other_insurance", "Other Insurance", "other_insurance"],
  ["rent", "Rent", "rent"],
  ["utilities_phone", "Utilities - Phone", "utilities_phone"],
  ["utilities_cable_internet", "Utilities - Cable/Internet", "utilities_cable_internet"],
  ["utilities_water", "Utilities - Water", "utilities_water"],
  ["utilities_gas_electric", "Utilities - Gas/Electric", "utilities_gas_electric"],
  ["marketing_print", "Marketing - Print", "marketing_print"],
  ["marketing_text_sms", "Marketing - Text/SMS", "marketing_text_sms"],
  ["marketing_social_media", "Marketing - Social Media", "marketing_social_media"],
  ["marketing_online_digital_ads", "Marketing - Online/Digital Ads", "marketing_online_digital_ads"],
  ["marketing_tv_radio", "Marketing - TV/Radio", "marketing_tv_radio"],
  ["maintenance_repairs", "Maintenance & Repairs", "maintenance_repairs"],
  ["travel", "Travel", "travel"],
  ["meals_entertainment", "Meals & Entertainment", "meals_entertainment"],
  ["office_supplies", "Office Supplies", "office_supplies"],
  ["professional_fees", "Professional Fees (Legal/Accounting)", "professional_fees"],
  ["bank_card_fees", "Bank & Credit Card Fees", "bank_card_fees"],
  ["misc_expense", "Misc Expense", "misc_expense"],
];

export const EXPENSE_LINES: BudgetLine[] = [
  { key: "exec_wages", label: "Executive Wages", section: "expenses", kind: "input", kpiField: "exec_wages" },
  { key: "staff_wages", label: "Staff Wages", section: "expenses", kind: "input", kpiField: "staff_wages" },
  { key: "payroll_tax_fica", label: "Payroll Tax - FICA", section: "expenses", kind: "calc" },
  { key: "payroll_tax_futa_suta", label: "Payroll Tax - FUTA/SUTA", section: "expenses", kind: "calc" },
  ...EXPENSE_SIMPLE.slice(2).map(([key, label, kpiField]) => ({
    key,
    label,
    section: "expenses" as const,
    kind: "input" as const,
    kpiField,
  })),
  ...[1, 2, 3, 4, 5].map((n) => ({
    key: `custom_expense_${n}`,
    label: `Custom Expense ${n}`,
    section: "expenses" as const,
    kind: "input" as const,
    renameable: true,
    kpiField: `custom_expense_${n}`,
  })),
  { key: "total_expenses", label: "TOTAL EXPENSES", section: "expenses", kind: "calc", emphasis: true },
  { key: "net_operating_income", label: "NET OPERATING INCOME", section: "expenses", kind: "calc", emphasis: true },
];

export const PAWN_LINES: BudgetLine[] = [
  { key: "pawn_loans_originated", label: "Pawn Loans Originated (cash out)", section: "pawn", kind: "input", kpiField: "dollar_pawns_written" },
  { key: "pawn_redeems_principal", label: "Pawn Redeems - Principal Returned (cash in)", section: "pawn", kind: "input", kpiField: "dollar_pawns_redeemed_principal" },
  { key: "pawn_defaults_inventory", label: "Pawn Defaults - $ Moved to Inventory (non-cash)", section: "pawn", kind: "input", kpiField: "dollar_pawns_defaulted" },
  { key: "buys_outright", label: "Buys - Outright Purchases (cash out, adds to Inventory)", section: "pawn", kind: "input", kpiField: "dollar_buys_30d" },
  { key: "beginning_inventory", label: "Beginning Inventory", section: "pawn", kind: "calc" },
  { key: "ending_inventory", label: "Ending Inventory", section: "pawn", kind: "calc" },
  { key: "taxable_retail_sales", label: "Taxable Retail Sales", section: "pawn", kind: "calc" },
  { key: "sales_tax_collected", label: "Sales Tax Collected (cash in)", section: "pawn", kind: "calc" },
  { key: "sales_tax_remitted", label: "Sales Tax Remitted (cash out)", section: "pawn", kind: "calc" },
];

export const ALL_LINES: BudgetLine[] = [...INCOME_LINES, ...EXPENSE_LINES, ...PAWN_LINES];

export const LINE_BY_KEY: Record<string, BudgetLine> = Object.fromEntries(
  ALL_LINES.map((l) => [l.key, l]),
);

/** Input lines that carry a value the user types (or a % on projected years) */
export const INPUT_KEYS = ALL_LINES.filter((l) => l.kind === "input").map((l) => l.key);

/** Map of KPI field_name -> budget line key, for pre-filling actual years */
export const KPI_TO_LINE: Record<string, string> = Object.fromEntries(
  ALL_LINES.filter((l) => l.kpiField).map((l) => [l.kpiField as string, l.key]),
);

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Years shown: 4 actual (current year and the 3 before) + 3 projected */
export function planYears(currentYear: number) {
  const actual = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear];
  const projected = [currentYear + 1, currentYear + 2, currentYear + 3];
  return { actual, projected, all: [...actual, ...projected] };
}
