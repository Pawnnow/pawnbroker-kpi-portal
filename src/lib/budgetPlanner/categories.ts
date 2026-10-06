export type LineKind = "input" | "calc" | "header";
export type LineSection = "income" | "expenses" | "pawn";
export type PlannerMode = "condensed" | "full";

export interface BudgetLine {
  key: string;
  label: string;
  section: LineSection;
  kind: LineKind;
  renameable?: boolean;
  emphasis?: boolean;
  kpiFields?: string[];
}

const input = (key: string, label: string, section: LineSection, kpiFields?: string[], renameable = false): BudgetLine =>
  ({ key, label, section, kind: "input", kpiFields, renameable });
const calc = (key: string, label: string, section: LineSection, emphasis = false): BudgetLine =>
  ({ key, label, section, kind: "calc", emphasis });

export const FULL_INCOME_LINES: BudgetLine[] = [
  input("retail_in_store", "Retail Sales - In Store", "income", ["retail_sales"]),
  input("retail_online", "Retail Sales - Online", "income", ["online_sales"]),
  calc("total_retail_sales", "Total Retail Sales", "income"),
  input("cogs", "Cost of Goods Sold (COGS)", "income", ["retail_cogs"]),
  calc("gross_profit", "Gross Profit", "income"),
  input("psc_collected", "Pawn Service Charges (PSC) Collected", "income", ["psc_collected"]),
  input("tax_exempt_scrap", "Tax Exempt Sales - Scrap Metal", "income", ["scrap_sales"]),
  input("tax_exempt_other", "Tax Exempt Sales - Other", "income", ["tax_exempt_sales"]),
  calc("total_tax_exempt", "Total Tax Exempt Sales", "income"),
  input("misc_income", "Misc Income", "income", ["misc_income"]),
  ...[1, 2, 3].map((n) => input(`custom_income_${n}`, `Custom Income ${n}`, "income", [`custom_income_${n}`], true)),
  calc("total_income", "TOTAL INCOME", "income", true),
];

export const FULL_EXPENSE_LINES: BudgetLine[] = [
  input("exec_wages", "Executive Wages", "expenses", ["exec_wages"]),
  input("staff_wages", "Staff Wages", "expenses", ["staff_wages"]),
  calc("payroll_tax_fica", "Payroll Tax - FICA", "expenses"),
  calc("payroll_tax_futa_suta", "Payroll Tax - FUTA/SUTA", "expenses"),
  input("medical_insurance", "Medical Insurance", "expenses", ["medical_insurance"]),
  input("liability_insurance", "Liability Insurance", "expenses", ["liability_insurance"]),
  input("other_insurance", "Other Insurance", "expenses", ["other_insurance"]),
  input("rent", "Rent", "expenses", ["rent"]),
  input("utilities_phone", "Utilities - Phone", "expenses", ["utilities_phone"]),
  input("utilities_cable_internet", "Utilities - Cable/Internet", "expenses", ["utilities_cable_internet"]),
  input("utilities_water", "Utilities - Water", "expenses", ["utilities_water"]),
  input("utilities_gas_electric", "Utilities - Gas/Electric", "expenses", ["utilities_gas_electric"]),
  input("marketing_print", "Marketing - Print", "expenses", ["marketing_print"]),
  input("marketing_text_sms", "Marketing - Text/SMS", "expenses", ["marketing_text", "marketing_text_sms"]),
  input("marketing_social_media", "Marketing - Social Media", "expenses", ["marketing_social_media"]),
  input("marketing_online_digital_ads", "Marketing - Online/Digital Ads", "expenses", ["marketing_online_digital_ads", "marketing_website"]),
  input("marketing_tv_radio", "Marketing - TV/Radio", "expenses", ["marketing_tv", "marketing_radio"]),
  input("maintenance_repairs", "Maintenance & Repairs", "expenses", ["maintenance_repairs"]),
  input("travel", "Travel", "expenses", ["travel"]),
  input("meals_entertainment", "Meals & Entertainment", "expenses", ["meals_entertainment"]),
  input("office_supplies", "Office Supplies", "expenses", ["office_supplies"]),
  input("professional_fees", "Professional Fees (Legal/Accounting)", "expenses", ["professional_fees"]),
  input("bank_card_fees", "Bank & Credit Card Fees", "expenses", ["bank_card_fees"]),
  input("misc_expense", "Misc Expense", "expenses", ["misc_expense"]),
  ...[1, 2, 3, 4, 5].map((n) => input(`custom_expense_${n}`, `Custom Expense ${n}`, "expenses", [`custom_expense_${n}`], true)),
  calc("total_expenses", "TOTAL EXPENSES", "expenses", true),
  calc("net_operating_income", "NET OPERATING INCOME", "expenses", true),
];

export const CONDENSED_INCOME_LINES: BudgetLine[] = [
  input("retail_sales", "Retail Sales", "income", ["retail_sales", "online_sales"]),
  input("custom_income_4", "Custom Income 4", "income", ["custom_income_4"], true),
  calc("total_retail_sales", "Total Retail Sales", "income"),
  input("cogs", "Cost of Goods Sold (COGS)", "income", ["retail_cogs"]),
  calc("gross_profit", "Gross Profit", "income"),
  input("psc_collected", "Pawn Service Charges (PSC) Collected", "income", ["psc_collected"]),
  input("tax_exempt_sales", "Tax Exempt Sales", "income", ["tax_exempt_sales", "scrap_sales"]),
  input("custom_income_5", "Custom Income 5", "income", ["custom_income_5"], true),
  calc("total_tax_exempt", "Total Tax Exempt Sales", "income"),
  input("misc_income", "Misc Income", "income", ["misc_income"]),
  ...[1, 2, 3].map((n) => input(`custom_income_${n}`, `Custom Income ${n}`, "income", [`custom_income_${n}`], true)),
  calc("total_income", "TOTAL INCOME", "income", true),
];

export const CONDENSED_EXPENSE_LINES: BudgetLine[] = [
  input("wages", "Wages", "expenses", ["condensed_wages", "exec_wages", "staff_wages"]),
  calc("payroll_tax_fica", "Payroll Tax - FICA", "expenses"),
  calc("payroll_tax_futa_suta", "Payroll Tax - FUTA/SUTA", "expenses"),
  input("insurance", "Insurance", "expenses", ["condensed_insurance", "medical_insurance", "liability_insurance", "other_insurance"]),
  input("rent", "Rent", "expenses", ["rent"]),
  input("utilities", "Utilities", "expenses", ["condensed_utilities", "utilities_phone", "utilities_cable_internet", "utilities_water", "utilities_gas_electric"]),
  input("marketing", "Marketing", "expenses", ["condensed_marketing", "total_marketing_spent", "marketing_print", "marketing_text", "marketing_text_sms", "marketing_social_media", "marketing_online_digital_ads", "marketing_website", "marketing_tv", "marketing_radio", "marketing_consulting"]),
  input("maintenance_repairs", "Maintenance & Repairs", "expenses", ["maintenance_repairs"]),
  input("travel_meals", "Travel & Meals", "expenses", ["condensed_travel_meals", "travel", "meals_entertainment"]),
  input("office_supplies", "Office Supplies", "expenses", ["office_supplies"]),
  input("professional_fees", "Professional Fees (Legal/Accounting)", "expenses", ["professional_fees"]),
  input("bank_card_fees", "Bank & Credit Card Fees", "expenses", ["bank_card_fees"]),
  input("misc_expense", "Misc Expense", "expenses", ["misc_expense"]),
  ...Array.from({ length: 16 }, (_, index) => index + 1).map((n) =>
    input(`custom_expense_${n}`, `Custom Expense ${n}`, "expenses", [`custom_expense_${n}`], true),
  ),
  calc("total_expenses", "TOTAL EXPENSES", "expenses", true),
  calc("net_operating_income", "NET OPERATING INCOME", "expenses", true),
];

export const PAWN_LINES: BudgetLine[] = [
  input("pawn_loans_originated", "Pawn Loans Originated (cash out)", "pawn", ["dollar_pawns_written"]),
  input("pawn_redeems_principal", "Pawn Redeems - Principal Returned (cash in)", "pawn", ["dollar_pawns_redeemed_principal"]),
  input("pawn_defaults_inventory", "Pawn Defaults - $ Moved to Inventory (non-cash)", "pawn", ["dollar_pawns_defaulted"]),
  input("buys_outright", "Buys - Outright Purchases (cash out, adds to Inventory)", "pawn", ["dollar_buys_30d"]),
  calc("beginning_inventory", "Beginning Inventory", "pawn"),
  calc("ending_inventory", "Ending Inventory", "pawn"),
  calc("taxable_retail_sales", "Taxable Retail Sales", "pawn"),
  calc("sales_tax_collected", "Sales Tax Collected (cash in)", "pawn"),
  calc("sales_tax_remitted", "Sales Tax Remitted (cash out)", "pawn"),
];

export interface PlannerSchema {
  income: BudgetLine[];
  expenses: BudgetLine[];
  pawn: BudgetLine[];
  all: BudgetLine[];
  inputKeys: string[];
  lineByKey: Record<string, BudgetLine>;
  kpiToLines: Record<string, string[]>;
}

const makeSchema = (income: BudgetLine[], expenses: BudgetLine[]): PlannerSchema => {
  const all = [...income, ...expenses, ...PAWN_LINES];
  const kpiToLines: Record<string, string[]> = {};
  all.forEach((line) => line.kpiFields?.forEach((field) => {
    kpiToLines[field] = [...(kpiToLines[field] ?? []), line.key];
  }));
  return {
    income,
    expenses,
    pawn: PAWN_LINES,
    all,
    inputKeys: all.filter((line) => line.kind === "input").map((line) => line.key),
    lineByKey: Object.fromEntries(all.map((line) => [line.key, line])),
    kpiToLines,
  };
};

export const PLANNER_SCHEMAS: Record<PlannerMode, PlannerSchema> = {
  full: makeSchema(FULL_INCOME_LINES, FULL_EXPENSE_LINES),
  condensed: makeSchema(CONDENSED_INCOME_LINES, CONDENSED_EXPENSE_LINES),
};

// Backwards-compatible exports for the unchanged full planner.
export const INCOME_LINES = FULL_INCOME_LINES;
export const EXPENSE_LINES = FULL_EXPENSE_LINES;
export const ALL_LINES = PLANNER_SCHEMAS.full.all;
export const LINE_BY_KEY = PLANNER_SCHEMAS.full.lineByKey;
export const INPUT_KEYS = PLANNER_SCHEMAS.full.inputKeys;
export const KPI_TO_LINE = Object.fromEntries(Object.entries(PLANNER_SCHEMAS.full.kpiToLines).map(([k, v]) => [k, v[0]]));
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export type Scenario = "actual" | "budget";
export interface PlanTab { id: string; year: number; scenario: Scenario; label: string; }
export function planYears(currentYear: number) {
  const actualYears = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  const budgetYears = [currentYear + 1, currentYear + 2, currentYear + 3];
  const actual: PlanTab[] = actualYears.map((year) => ({ id: `actual-${year}`, year, scenario: "actual", label: String(year) }));
  const budget: PlanTab[] = budgetYears.map((year) => ({ id: `budget-${year}`, year, scenario: "budget", label: `${year} Budget` }));
  return { actual, budget, all: [...actual, ...budget] };
}
