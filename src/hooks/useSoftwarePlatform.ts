import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SoftwarePlatform = "pawnmate" | "other";

/**
 * Which point-of-sale software the signed-in user is on. Admin-controlled,
 * stored on profiles.software_platform. Defaults to "other" (the classic
 * Basic/Advanced upload portal).
 */
export const useSoftwarePlatform = () => {
  return useQuery({
    queryKey: ["software-platform"],
    queryFn: async (): Promise<{ platform: SoftwarePlatform; group: number | null; email: string | null }> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { platform: "other", group: null, email: null };

      const { data, error } = await supabase
        .from("profiles")
        .select("software_platform, group, email")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data) return { platform: "other", group: null, email: user.email ?? null };

      const platform = ((data as any).software_platform === "pawnmate" ? "pawnmate" : "other") as SoftwarePlatform;
      return { platform, group: (data as any).group ?? null, email: (data as any).email ?? user.email ?? null };
    },
  });
};
