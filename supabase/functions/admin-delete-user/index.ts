import { createClient } from "npm:@supabase/supabase-js@2";

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
      console.log("Missing authorization header");
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
      console.log("Invalid authentication:", userError?.message);
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
      console.log("Not an admin:", roleError?.message);
      return new Response(
        JSON.stringify({ error: "Only administrators can delete users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const { user_id } = await req.json();

    // Validate required fields
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent admin from deleting themselves
    if (user_id === callerUser.id) {
      return new Response(
        JSON.stringify({ error: "You cannot delete your own account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user info for logging
    const { data: userProfile } = await adminClient
      .from("profiles")
      .select("user_name, email, full_name")
      .eq("id", user_id)
      .single();

    console.log("Deleting user:", { user_id, profile: userProfile });

    // Delete user's KPI entries first (cascade should handle this, but being explicit)
    const { error: kpiDeleteError } = await adminClient
      .from("kpi_entries")
      .delete()
      .eq("user_id", user_id);

    if (kpiDeleteError) {
      console.log("Error deleting KPI entries:", kpiDeleteError.message);
      // Continue anyway as auth deletion will cascade
    }

    // Delete user's API keys
    const { error: apiKeyDeleteError } = await adminClient
      .from("api_keys")
      .delete()
      .eq("user_id", user_id);

    if (apiKeyDeleteError) {
      console.log("Error deleting API keys:", apiKeyDeleteError.message);
      // Continue anyway
    }

    // Delete user roles
    const { error: roleDeleteError } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", user_id);

    if (roleDeleteError) {
      console.log("Error deleting user roles:", roleDeleteError.message);
      // Continue anyway
    }

    // Delete the profile
    const { error: profileDeleteError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", user_id);

    if (profileDeleteError) {
      console.log("Error deleting profile:", profileDeleteError.message);
      // Continue to try auth deletion
    }

    // Delete the user from auth.users
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      console.log("Error deleting auth user:", authDeleteError.message);
      return new Response(
        JSON.stringify({ error: "Failed to delete user: " + authDeleteError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully deleted user:", user_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${userProfile?.user_name || userProfile?.email || user_id} has been deleted`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in admin-delete-user:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
