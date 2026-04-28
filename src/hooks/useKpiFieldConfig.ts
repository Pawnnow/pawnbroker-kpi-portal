import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ColumnGroup =
  | "pawn_performance"
  | "merchandise_performance"
  | "financial_summary"
  | "customer_marketing";

interface KpiFieldConfig {
  id: string;
  field_name: string;
  category: string;
  field_label: string;
  is_visible: boolean;
  is_required: boolean;
  display_order: number;
  column_group: ColumnGroup;
}

export const useKpiFieldConfig = () => {
  return useQuery({
    queryKey: ["kpi-field-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_field_config")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as unknown as KpiFieldConfig[];
    },
  });
};

export const useVisibleKpiFields = () => {
  const { data: allFields, isLoading, error } = useKpiFieldConfig();

  const visibleByCategory = (category: string) =>
    allFields
      ?.filter((f) => f.category === category && f.is_visible)
      ?.map((f) => ({ name: f.field_name, label: f.field_label, isRequired: f.is_required })) ?? [];

  // Visible KPI fields (pawn/merchandise/marketing categories) grouped by column_group
  const KPI_CATEGORIES = new Set(["pawn", "merchandise", "marketing"]);
  const visibleKpiFields =
    allFields
      ?.filter((f) => KPI_CATEGORIES.has(f.category) && f.is_visible)
      ?.sort((a, b) => a.display_order - b.display_order) ?? [];

  const byColumn = (group: ColumnGroup) =>
    visibleKpiFields
      .filter((f) => (f.column_group ?? "pawn_performance") === group)
      .map((f) => ({ name: f.field_name, label: f.field_label, isRequired: f.is_required }));

  // Map field_name -> source category, used by the submit logic to keep
  // historical exports/dashboards working unchanged.
  const fieldNameToCategory: Record<string, string> = {};
  allFields?.forEach((f) => {
    if (KPI_CATEGORIES.has(f.category)) fieldNameToCategory[f.field_name] = f.category;
  });

  const isGridVisible = (gridFieldName: string) =>
    allFields?.find((f) => f.field_name === gridFieldName)?.is_visible ?? true;

  // Map aged_inventory column field_names back to their display labels
  const AGED_COL_MAP: Record<string, string> = {
    aged_col_total_num: "Total #",
    aged_col_total_dollar: "Total $",
    aged_col_jewelry: "Jewelry",
    aged_col_electronics: "Electronics",
    aged_col_tools: "Tools",
    aged_col_musical: "Musical",
    aged_col_games: "Games",
    aged_col_firearms: "Firearms",
    aged_col_coins_bullion: "Coins Bullion",
    aged_col_other: "Other",
  };

  const visibleAgedInventoryColumns =
    allFields
      ?.filter((f) => f.category === "aged_inventory" && f.is_visible)
      ?.sort((a, b) => a.display_order - b.display_order)
      ?.map((f) => AGED_COL_MAP[f.field_name])
      ?.filter(Boolean) ?? Object.values(AGED_COL_MAP);

  const requiredFieldNames =
    allFields
      ?.filter((f) => f.is_visible && f.is_required && f.category !== "aged_inventory_row" && f.category !== "aged_inventory")
      ?.map((f) => f.field_name) ?? [];

  const requiredFieldLabels =
    allFields
      ?.filter((f) => f.is_visible && f.is_required && f.category !== "aged_inventory_row" && f.category !== "aged_inventory")
      ?.reduce((acc, f) => { acc[f.field_name] = f.field_label; return acc; }, {} as Record<string, string>) ?? {};

  // Map aged_inventory_row field_names to their row labels when required
  const AGED_ROW_MAP: Record<string, string> = {
    aged_row_0_90: "0–90 Days",
    aged_row_91_120: "91–120 Days",
    aged_row_121_180: "121–180 Days",
    aged_row_181_210: "181–210 Days",
    aged_row_211_365: "211–365 Days",
    aged_row_365_plus: "365+ Days",
  };

  const requiredAgedRows =
    allFields
      ?.filter((f) => f.category === "aged_inventory_row" && f.is_visible && f.is_required)
      ?.map((f) => AGED_ROW_MAP[f.field_name])
      ?.filter(Boolean) ?? [];

  return {
    isLoading,
    error,
    // Legacy category-based getters kept for backwards compatibility
    pawnKpis: visibleByCategory("pawn"),
    merchandiseKpis: visibleByCategory("merchandise"),
    marketingKpis: visibleByCategory("marketing"),
    // New column-group getters
    pawnPerformanceKpis: byColumn("pawn_performance"),
    merchandisePerformanceKpis: byColumn("merchandise_performance"),
    financialSummaryKpis: byColumn("financial_summary"),
    customerMarketingKpis: byColumn("customer_marketing"),
    fieldNameToCategory,
    visibleAgedInventoryColumns,
    showAgedInventoryGrid: visibleAgedInventoryColumns.length > 0,
    showPawnBalanceGrid: isGridVisible("pawn_balance_grid"),
    requiredFieldNames,
    requiredFieldLabels,
    requiredAgedRows,
  };
};
