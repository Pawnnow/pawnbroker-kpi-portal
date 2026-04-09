import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { KpiEntry } from "./useKpiData";

interface AdminKpiEntry extends KpiEntry {
  user_id: string;
  user_email?: string;
  store_code?: string | null;
  store_name?: string | null;
  location_id?: string | null;
}

const BATCH_SIZE = 1000;

async function fetchAllKpiEntries() {
  let allData: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("kpi_entries")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      offset += BATCH_SIZE;
      // If we got fewer than BATCH_SIZE, we've reached the end
      hasMore = data.length === BATCH_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
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

      // Fetch all KPI entries using pagination to bypass 1000-row limit
      const data = await fetchAllKpiEntries();

      // Get unique user IDs
      const userIds = [...new Set(data?.map(d => d.user_id) || [])];

      // Fetch user profiles for email lookup
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      // Build a user_name map for fallback store_code (single-store accounts)
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, user_name")
        .in("id", userIds);
      const userNameMap = new Map(allProfiles?.map(p => [p.id, p.user_name]) || []);

      // Fetch all locations for store_code lookup
      const locationIds = [...new Set(data?.filter(d => d.location_id).map(d => d.location_id) || [])];
      let locationMap = new Map<string, { store_code: string; store_name: string }>();
      if (locationIds.length > 0) {
        const { data: locations } = await supabase
          .from("locations")
          .select("id, store_code, store_name")
          .in("id", locationIds);
        if (locations) {
          locations.forEach((loc: any) => {
            locationMap.set(loc.id, { store_code: loc.store_code, store_name: loc.store_name });
          });
        }
      }

      // Attach email and location info to each entry
      const enrichedData = data?.map(entry => {
        const loc = entry.location_id ? locationMap.get(entry.location_id) : null;
        return {
          ...entry,
          user_email: emailMap.get(entry.user_id) || "Unknown",
          store_code: loc?.store_code || null,
          store_name: loc?.store_name || null,
        };
      }) as AdminKpiEntry[];

      return enrichedData;
    },
  });
};
