import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KpiEntry {
  id: string;
  year: number;
  month: number;
  field_name: string;
  field_label: string;
  field_value: string | null;
  category: string;
  created_at: string | null;
}

export const useKpiData = () => {
  return useQuery({
    queryKey: ["kpi-entries"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("kpi_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("year", { ascending: true })
        .order("month", { ascending: true });

      if (error) throw error;
      return data as KpiEntry[];
    },
  });
};

export const getMonthName = (month: number): string => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[month - 1] || "";
};

export const formatCurrency = (value: string | null): number => {
  if (!value) return 0;
  const num = parseFloat(value.replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};
