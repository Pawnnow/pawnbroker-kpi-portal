import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlannerMode } from "@/lib/budgetPlanner/categories";

/**
 * Per-user renamed labels for the "Custom Income" / "Custom Expense" slots.
 * Falls back to the default label from kpi_field_config when a user has not
 * renamed a slot.
 */
export const useUserFieldLabels = (userId: string | null, plannerMode: PlannerMode) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["user-field-labels", userId, plannerMode],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_field_labels" as any)
        .select("field_name, label")
        .eq("user_id", userId as string)
        .eq("planner_mode", plannerMode);

      if (error) throw error;
      const map: Record<string, string> = {};
      (data as any[] | null)?.forEach((r) => { map[r.field_name] = r.label; });
      return map;
    },
  });

  const saveLabel = async (fieldName: string, label: string) => {
    if (!userId) return;
    const trimmed = label.trim();

    if (!trimmed) {
      await supabase
        .from("user_field_labels" as any)
        .delete()
        .eq("user_id", userId)
        .eq("field_name", fieldName)
        .eq("planner_mode", plannerMode);
    } else {
      await supabase
        .from("user_field_labels" as any)
        .upsert({ user_id: userId, field_name: fieldName, label: trimmed, planner_mode: plannerMode } as any, {
          onConflict: "user_id,field_name,planner_mode",
        });
    }

    queryClient.setQueryData(["user-field-labels", userId, plannerMode], (old: Record<string, string> | undefined) => {
      const next = { ...(old || {}) };
      if (trimmed) next[fieldName] = trimmed;
      else delete next[fieldName];
      return next;
    });
  };

  return { labels: query.data ?? {}, isLoading: query.isLoading, saveLabel };
};
