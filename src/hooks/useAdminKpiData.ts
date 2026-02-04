import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { KpiEntry } from "./useKpiData";

interface AdminKpiEntry extends KpiEntry {
  user_id: string;
  user_email?: string;
}

export const useAdminKpiData = () => {
  return useQuery({
    queryKey: ["admin-kpi-entries"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        throw new Error("Access denied: Admin role required");
      }

      // Fetch all KPI entries (admin can see all)
      const { data, error } = await supabase
        .from("kpi_entries")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(300000);

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(data?.map(d => d.user_id) || [])];

      // Fetch user profiles for email lookup
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      // Attach email to each entry
      const enrichedData = data?.map(entry => ({
        ...entry,
        user_email: emailMap.get(entry.user_id) || "Unknown",
      })) as AdminKpiEntry[];

      return enrichedData;
    },
  });
};
