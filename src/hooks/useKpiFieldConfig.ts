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

  return {
    isLoading,
    error,
    pawnKpis: visibleByCategory("pawn"),
    merchandiseKpis: visibleByCategory("merchandise"),
    marketingKpis: visibleByCategory("marketing"),
    showAgedInventoryGrid: isGridVisible("aged_inventory_grid"),
    showPawnBalanceGrid: isGridVisible("pawn_balance_grid"),
  };
};
