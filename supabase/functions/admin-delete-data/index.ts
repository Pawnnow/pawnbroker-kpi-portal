import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the authorization header to verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify admin status
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user: callerUser }, error: userError } = await userClient.auth.getUser();
    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the caller is an admin using the has_role function
    const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
      _user_id: callerUser.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.log("Admin check failed:", roleError?.message || "Not an admin");
      return new Response(
        JSON.stringify({ error: "Only administrators can delete data" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const { action, entry_ids } = await req.json();

    // Validate action
    if (!action || !["delete_selected", "clear_all"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action. Must be 'delete_selected' or 'clear_all'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key for deletion
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let deletedCount = 0;

    if (action === "clear_all") {
      // Delete all KPI entries
      console.log("Clearing all KPI entries...");
      const { data, error: deleteError } = await adminClient
        .from("kpi_entries")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000") // This ensures we match all rows
        .select("id");

      if (deleteError) {
        console.error("Error deleting all entries:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to clear database: " + deleteError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      deletedCount = data?.length || 0;
      console.log(`Deleted ${deletedCount} entries`);
    } else if (action === "delete_selected") {
      // Validate entry_ids
      if (!entry_ids || !Array.isArray(entry_ids) || entry_ids.length === 0) {
        return new Response(
          JSON.stringify({ error: "entry_ids is required and must be a non-empty array" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Deleting ${entry_ids.length} selected entries...`);
      const { data, error: deleteError } = await adminClient
        .from("kpi_entries")
        .delete()
        .in("id", entry_ids)
        .select("id");

      if (deleteError) {
        console.error("Error deleting selected entries:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to delete selected entries: " + deleteError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      deletedCount = data?.length || 0;
      console.log(`Deleted ${deletedCount} entries`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted_count: deletedCount,
        action,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in admin-delete-data:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
