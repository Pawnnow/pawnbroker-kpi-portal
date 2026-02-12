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
        JSON.stringify({ error: "Only administrators can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the request body
    const { email, password, user_name, full_name, group } = await req.json();

    // Validate required fields
    if (!email || !password || !user_name) {
      return new Response(
        JSON.stringify({ error: "Email, password, and user_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate group value if provided
    const groupValue = typeof group === 'number' ? group : 0;
    if (groupValue < 0 || groupValue > 5) {
      return new Response(
        JSON.stringify({ error: "Group must be between 0 and 5" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate user_name format (alphanumeric, underscores, hyphens)
    const userNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!userNameRegex.test(user_name)) {
      return new Response(
        JSON.stringify({ error: "User name can only contain letters, numbers, underscores, and hyphens" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user_name is already taken
    const { data: existingUserName } = await adminClient
      .from("profiles")
      .select("id")
      .eq("user_name", user_name)
      .single();

    if (existingUserName) {
      return new Response(
        JSON.stringify({ error: "User name is already taken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user in Supabase Auth
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email since admin is creating the account
      user_metadata: {
        full_name: full_name || "",
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the profile with user_name, group, and must_change_password flag
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        user_name,
        full_name: full_name || "",
        must_change_password: true,
        group: groupValue,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      // If profile update fails, try to clean up the created user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to update user profile: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send welcome email (best-effort, don't fail user creation if email fails)
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Pawnbroker KPI Portal <noreply@updates.pawnbrokerkpi.com>",
            to: [email],
            subject: "Welcome to Pawnbroker KPI Portal",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a2e;">Welcome to Pawnbroker KPI Portal</h2>
                <p>Hello <strong>${user_name}</strong>,</p>
                <p>Your account has been created. Here are your login credentials:</p>
                <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 4px 0;"><strong>Username:</strong> ${user_name}</p>
                  <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${password}</p>
                </div>
                <p style="color: #e74c3c; font-weight: bold;">You will be required to change your password on first login.</p>
                <p>If you have any questions, please contact your administrator.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="font-size: 12px; color: #888;">Pawnbroker KPI Portal</p>
              </div>
            `,
          }),
        });
        if (!emailRes.ok) {
          console.error("Welcome email failed:", await emailRes.text());
        }
      }
    } catch (emailErr) {
      console.error("Welcome email error:", emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          user_name,
          full_name: full_name || "",
          group: groupValue,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
