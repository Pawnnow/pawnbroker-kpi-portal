import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      console.log("Missing identifier or password");
      return new Response(
        JSON.stringify({ error: "Username/email and password are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client for username lookup
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    let email = identifier.trim();

    // Check if identifier is an email (contains @) or username
    if (!identifier.includes("@")) {
      console.log("Identifier is a username, looking up email...");
      
      // Look up email from profiles table using the username
      const { data: profile, error: lookupError } = await adminClient
        .from("profiles")
        .select("email")
        .eq("user_name", identifier.trim())
        .maybeSingle();

      if (lookupError) {
        console.error("Error looking up username:", lookupError);
        return new Response(
          JSON.stringify({ error: "Invalid credentials" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!profile || !profile.email) {
        console.log("Username not found in profiles");
        // Return generic error to prevent username enumeration
        return new Response(
          JSON.stringify({ error: "Invalid credentials" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      email = profile.email;
      console.log("Found email for username");
    }

    // Create client with anon key for authentication
    const authClient = createClient(supabaseUrl, supabaseAnonKey);

    // Sign in with the email and password
    const { data, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Sign in error:", signInError.message);
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Login successful for user:", data.user?.id);

    return new Response(
      JSON.stringify({
        session: data.session,
        user: data.user,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
