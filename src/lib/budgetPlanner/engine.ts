import { INPUT_KEYS } from "./categories";

export type Series = number[]; // length 12

export interface YearSettings {
  fica_rate: number; // e.g. 0.0765
  futa_suta_rate: number; // e.g. 0.031
  state_tax_rate: number;
  county_tax_rate: number;
  city_tax_rate: number;
  beginning_inventory: number;
  beginning_cash: number;
}

export const DEFAULT_SETTINGS: YearSettings = {
  fica_rate: 0.0765,
  futa_suta_rate: 0.031,
  state_tax_rate: 0.06,
  county_tax_rate: 0.01,
  city_tax_rate: 0,
  beginning_inventory: 0,
  beginning_cash: 0,
};

export type ValueMap = Record<string, Series>;

export const zeros = (): Series => Array(12).fill(0);

export const emptyValues = (): ValueMap =>
  Object.fromEntries(INPUT_KEYS.map((k) => [k, zeros()]));

const get = (v: ValueMap, k: string): Series => v[k] ?? zeros();
const add = (...s: Series[]): Series =>
  Array.from({ length: 12 }, (_, m) => s.reduce((t, x) => t + (x[m] || 0), 0));
const sub = (a: Series, b: Series): Series =>
  Array.from({ length: 12 }, (_, m) => (a[m] || 0) - (b[m] || 0));
const scale = (a: Series, f: number): Series => a.map((x) => (x || 0) * f);

export const sum = (s: Series): number => s.reduce((t, x) => t + (x || 0), 0);

export interface ComputedYear {
  values: ValueMap; // inputs + calculated rows, all 12 months
  endingInventoryDec: number;
}

export function computeYear(inputs: ValueMap, settings: YearSettings): ComputedYear {
  const v: ValueMap = { ...inputs };

  v.total_retail_sales = add(get(v, "retail_in_store"), get(v, "retail_online"));
  v.gross_profit = sub(v.total_retail_sales, get(v, "cogs"));
  v.total_tax_exempt = add(get(v, "tax_exempt_scrap"), get(v, "tax_exempt_other"));
  v.total_income = add(
    v.total_retail_sales,
    get(v, "psc_collected"),
    v.total_tax_exempt,
    get(v, "misc_income"),
    get(v, "custom_income_1"),
    get(v, "custom_income_2"),
    get(v, "custom_income_3"),
  );

  const wages = add(get(v, "exec_wages"), get(v, "staff_wages"));
  v.payroll_tax_fica = scale(wages, settings.fica_rate);
  v.payroll_tax_futa_suta = scale(wages, settings.futa_suta_rate);

  const expenseKeys = [
    "exec_wages",
    "staff_wages",
    "payroll_tax_fica",
    "payroll_tax_futa_suta",
    "medical_insurance",
    "liability_insurance",
    "other_insurance",
    "rent",
    "utilities_phone",
    "utilities_cable_internet",
    "utilities_water",
    "utilities_gas_electric",
    "marketing_print",
    "marketing_text_sms",
    "marketing_social_media",
    "marketing_online_digital_ads",
    "marketing_tv_radio",
    "maintenance_repairs",
    "travel",
    "meals_entertainment",
    "office_supplies",
    "professional_fees",
    "bank_card_fees",
    "misc_expense",
    "custom_expense_1",
    "custom_expense_2",
    "custom_expense_3",
    "custom_expense_4",
    "custom_expense_5",
  ];
  v.total_expenses = add(...expenseKeys.map((k) => get(v, k)));
  v.net_operating_income = sub(sub(v.total_income, get(v, "cogs")), v.total_expenses);

  // Inventory roll-forward: Beginning + Buys + Defaults - COGS = Ending
  const beginning = zeros();
  const ending = zeros();
  let carry = settings.beginning_inventory;
  for (let m = 0; m < 12; m++) {
    beginning[m] = carry;
    ending[m] =
      carry +
      (get(v, "buys_outright")[m] || 0) +
      (get(v, "pawn_defaults_inventory")[m] || 0) -
      (get(v, "cogs")[m] || 0);
    carry = ending[m];
  }
  v.beginning_inventory = beginning;
  v.ending_inventory = ending;

  // Sales tax
  const taxRate = settings.state_tax_rate + settings.county_tax_rate + settings.city_tax_rate;
  v.taxable_retail_sales = v.total_retail_sales;
  v.sales_tax_collected = scale(v.taxable_retail_sales, taxRate);
  v.sales_tax_remitted = Array.from({ length: 12 }, (_, m) =>
    m === 0 ? 0 : v.sales_tax_collected[m - 1],
  );

  return { values: v, endingInventoryDec: carry };
}

/**
 * Build the input series for a projected year: each month = the same month of
 * the prior year times (1 + adjustment%), unless the user typed an override.
 */
export function projectInputs(
  priorYearValues: ValueMap,
  adjustments: Record<string, number>,
  overrides: ValueMap,
): ValueMap {
  const out: ValueMap = {};
  for (const key of INPUT_KEYS) {
    const prior = priorYearValues[key] ?? zeros();
    const pct = adjustments[key] ?? 0;
    const ov = overrides[key];
    out[key] = Array.from({ length: 12 }, (_, m) => {
      const o = ov?.[m];
      if (o !== undefined && o !== null && !Number.isNaN(o) && o !== 0) return o;
      return (prior[m] || 0) * (1 + pct);
    });
  }
  return out;
}

export interface CashFlowRow {
  label: string;
  series: Series;
  emphasis?: boolean;
}

export function computeCashFlow(v: ValueMap, beginningCash: number) {
  const beginning = zeros();
  const ending = zeros();
  const net = zeros();
  let carry = beginningCash;
  for (let m = 0; m < 12; m++) {
    beginning[m] = carry;
    const cashIn =
      (v.total_income?.[m] || 0) +
      (v.pawn_redeems_principal?.[m] || 0) +
      (v.sales_tax_collected?.[m] || 0);
    const cashOut =
      (v.total_expenses?.[m] || 0) +
      (v.pawn_loans_originated?.[m] || 0) +
      (v.buys_outright?.[m] || 0) +
      (v.sales_tax_remitted?.[m] || 0);
    net[m] = cashIn - cashOut;
    ending[m] = carry + net[m];
    carry = ending[m];
  }
  const burn = Array.from({ length: 12 }, (_, m) => (v.total_expenses?.[m] || 0));
  return { beginning, ending, net, burn, endingCashDec: carry };
}

export const fmtMoney = (n: number) =>
  (n < 0 ? "-" : "") +
  "$" +
  Math.abs(Math.round(n)).toLocaleString("en-US");

export const fmtPct = (n: number) =>
  `${(n * 100).toFixed(1)}%`;
