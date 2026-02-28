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
      return new Response(
        JSON.stringify({ error: "Only administrators can update users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const { user_id, email, user_name, full_name, member_number, group, is_admin } = await req.json();

    // Validate required fields
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate group value if provided
    if (group !== undefined) {
      const groupValue = typeof group === 'number' ? group : parseInt(group, 10);
      if (isNaN(groupValue) || groupValue < 0 || groupValue > 5) {
        return new Response(
          JSON.stringify({ error: "Group must be between 0 and 5" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate user_name format if provided (alphanumeric, underscores, hyphens)
    if (user_name) {
      const userNameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!userNameRegex.test(user_name)) {
        return new Response(
          JSON.stringify({ error: "User name can only contain letters, numbers, underscores, and hyphens" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user_name is already taken by another user
    if (user_name) {
      const { data: existingUserName } = await adminClient
        .from("profiles")
        .select("id")
        .eq("user_name", user_name)
        .neq("id", user_id)
        .single();

      if (existingUserName) {
        return new Response(
          JSON.stringify({ error: "User name is already taken" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if member_number is already taken by another user
    if (member_number) {
      const { data: existingMember } = await adminClient
        .from("profiles")
        .select("id")
        .eq("member_number", member_number)
        .neq("id", user_id)
        .single();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: "Member number is already taken" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update email in Auth if provided
    if (email) {
      const { error: emailError } = await adminClient.auth.admin.updateUserById(user_id, {
        email,
        email_confirm: true,
      });

      if (emailError) {
        console.error("Error updating email:", emailError);
        return new Response(
          JSON.stringify({ error: "Failed to update email: " + emailError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build profile update object
    const profileUpdate: Record<string, any> = {};
    if (user_name !== undefined) profileUpdate.user_name = user_name;
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (member_number !== undefined) profileUpdate.member_number = member_number;
    if (group !== undefined) profileUpdate.group = typeof group === 'number' ? group : parseInt(group, 10);
    if (email !== undefined) profileUpdate.email = email;

    // Update profile if there are changes
    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await adminClient
        .from("profiles")
        .update(profileUpdate)
        .eq("id", user_id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        return new Response(
          JSON.stringify({ error: "Failed to update profile: " + profileError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle admin role changes
    if (is_admin !== undefined) {
      // Prevent admin from removing their own admin status
      if (user_id === callerUser.id && !is_admin) {
        return new Response(
          JSON.stringify({ error: "You cannot remove your own admin status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check current admin status
      const { data: existingRole } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", user_id)
        .eq("role", "admin")
        .single();

      if (is_admin && !existingRole) {
        // Add admin role
        const { error: insertError } = await adminClient
          .from("user_roles")
          .insert({ user_id, role: "admin" });

        if (insertError) {
          console.error("Error adding admin role:", insertError);
          return new Response(
            JSON.stringify({ error: "Failed to add admin role: " + insertError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (!is_admin && existingRole) {
        // Remove admin role
        const { error: deleteError } = await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", user_id)
          .eq("role", "admin");

        if (deleteError) {
          console.error("Error removing admin role:", deleteError);
          return new Response(
            JSON.stringify({ error: "Failed to remove admin role: " + deleteError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    console.log(`User ${user_id} updated successfully by admin ${callerUser.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "User updated successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error in admin-update-user:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
