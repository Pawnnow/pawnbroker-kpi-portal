import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAdmin(req: Request, supabaseUrl: string, supabaseAnonKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Invalid authentication");

  const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (roleError || !isAdmin) throw new Error("Only administrators can create users");
  return user;
}

function validateInput(body: { email: string; password: string; user_name: string; member_number?: string; group?: number }) {
  const { email, password, user_name, member_number, group } = body;
  if (!email || !password || !user_name) throw new Error("Email, password, and user_name are required");
  if (!member_number) throw new Error("Member number is required");

  const groupValue = typeof group === "number" ? group : 0;
  if (groupValue < 0 || groupValue > 5) throw new Error("Group must be between 0 and 5");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email format");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  if (!/^[a-zA-Z0-9_-]+$/.test(user_name)) throw new Error("User name can only contain letters, numbers, underscores, and hyphens");

  return groupValue;
}

async function sendWelcomeEmail(
  adminClient: any,
  resendApiKey: string,
  email: string,
  user_name: string,
  password: string,
  full_name: string,
  member_number: string,
) {
  // Fetch template from DB
  const { data: tpl } = await adminClient
    .from("email_templates")
    .select("subject, body_html, attachment_url, attachment_filename")
    .eq("template_type", "welcome")
    .single();

  let subject = "Welcome to Pawnbroker KPI Portal";
  let html = `<p>Hello ${user_name}, your account has been created. Password: ${password}</p>`;
  let attachments: any[] = [];

  if (tpl) {
    const replacePlaceholders = (text: string) =>
      text
        .replace(/\{\{user_name\}\}/g, user_name)
        .replace(/\{\{email\}\}/g, email)
        .replace(/\{\{password\}\}/g, password)
        .replace(/\{\{full_name\}\}/g, full_name || "")
        .replace(/\{\{member_number\}\}/g, member_number || "");

    subject = replacePlaceholders(tpl.subject);
    html = replacePlaceholders(tpl.body_html);

    // Handle attachment
    if (tpl.attachment_url) {
      try {
        const fileRes = await fetch(tpl.attachment_url);
        if (fileRes.ok) {
          const arrayBuf = await fileRes.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));
          attachments.push({
            filename: tpl.attachment_filename || "attachment",
            content: base64,
          });
        }
      } catch (e) {
        console.error("Failed to fetch attachment:", e);
      }
    }
  }

  const emailBody: any = {
    from: "Pawnbroker KPI Portal <noreply@kpi.pawngorillas.com>",
    to: [email],
    subject,
    html,
  };
  if (attachments.length > 0) emailBody.attachments = attachments;

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify(emailBody),
  });

  if (!emailRes.ok) {
    console.error("Welcome email failed:", await emailRes.text());
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    await verifyAdmin(req, supabaseUrl, supabaseAnonKey);

    const body = await req.json();
    const { email, password, user_name, full_name, member_number } = body;
    const groupValue = validateInput(body);

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

    // Check if member_number is already taken
    if (member_number) {
      const { data: existingMember } = await adminClient
        .from("profiles")
        .select("id")
        .eq("member_number", member_number)
        .single();

      if (existingMember) {
        return new Response(
          JSON.stringify({ error: "Member number is already taken" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create the user
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || "" },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        user_name,
        full_name: full_name || "",
        member_number: member_number || null,
        must_change_password: true,
        group: groupValue,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to update user profile: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send welcome email (best-effort)
    let emailSent = false;
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        emailSent = await sendWelcomeEmail(adminClient, resendApiKey, email, user_name, password, full_name || "", member_number || "");
      }
    } catch (emailErr) {
      console.error("Welcome email error:", emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_sent: emailSent,
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
    const status = errorMessage.includes("authorization") || errorMessage.includes("authentication") ? 401
      : errorMessage.includes("administrators") ? 403 : 400;
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
