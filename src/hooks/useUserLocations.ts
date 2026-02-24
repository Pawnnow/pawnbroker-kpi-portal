import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Location {
  id: string;
  user_id: string;
  store_code: string;
  store_name: string;
  is_active: boolean;
  created_at: string;
}

export const useUserLocations = () => {
  return useQuery({
    queryKey: ["user-locations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("store_code");

      if (error) throw error;
      return (data || []) as Location[];
    },
  });
};
