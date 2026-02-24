import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface KpiFieldConfig {
  id: string;
  field_name: string;
  category: string;
  field_label: string;
  is_visible: boolean;
  display_order: number;
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
      return data as KpiFieldConfig[];
    },
  });
};

export const useVisibleKpiFields = () => {
  const { data: allFields, isLoading, error } = useKpiFieldConfig();

  const visibleByCategory = (category: string) =>
    allFields
      ?.filter((f) => f.category === category && f.is_visible)
      ?.map((f) => ({ name: f.field_name, label: f.field_label })) ?? [];

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

  return {
    isLoading,
    error,
    pawnKpis: visibleByCategory("pawn"),
    merchandiseKpis: visibleByCategory("merchandise"),
    marketingKpis: visibleByCategory("marketing"),
    visibleAgedInventoryColumns,
    showAgedInventoryGrid: visibleAgedInventoryColumns.length > 0,
    showPawnBalanceGrid: isGridVisible("pawn_balance_grid"),
  };
};
