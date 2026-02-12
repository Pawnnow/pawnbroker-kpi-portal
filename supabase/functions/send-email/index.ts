import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "welcome" | "password-reset";
  to: string;
  user_name?: string;
  temporary_password?: string;
  reset_link?: string;
}

function buildWelcomeEmail(to: string, userName: string, tempPassword: string): { subject: string; html: string } {
  return {
    subject: "Welcome to Pawnbroker KPI Portal",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">Welcome to Pawnbroker KPI Portal</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Your account has been created. Here are your login credentials:</p>
        <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Username:</strong> ${userName}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <p style="color: #e74c3c; font-weight: bold;">You will be required to change your password on first login.</p>
        <p>If you have any questions, please contact your administrator.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #888;">Pawnbroker KPI Portal</p>
      </div>
    `,
  };
}

function buildPasswordResetEmail(resetLink: string): { subject: string; html: string } {
  return {
    subject: "Reset Your Password - Pawnbroker KPI Portal",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">Password Reset Request</h2>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" style="background: #1a1a2e; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reset Password</a>
        </div>
        <p style="font-size: 14px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
        <p style="font-size: 14px; color: #666;">This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #888;">Pawnbroker KPI Portal</p>
      </div>
    `,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: EmailRequest = await req.json();
    const { type, to } = body;

    if (!type || !to) {
      return new Response(
        JSON.stringify({ error: "type and to are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject: string;
    let html: string;

    if (type === "welcome") {
      if (!body.user_name || !body.temporary_password) {
        return new Response(
          JSON.stringify({ error: "user_name and temporary_password required for welcome emails" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      ({ subject, html } = buildWelcomeEmail(to, body.user_name, body.temporary_password));
    } else if (type === "password-reset") {
      if (!body.reset_link) {
        return new Response(
          JSON.stringify({ error: "reset_link required for password reset emails" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      ({ subject, html } = buildPasswordResetEmail(body.reset_link));
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid email type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Pawnbroker KPI Portal <noreply@updates.pawnbrokerkpi.com>",
        to: [to],
        subject,
        html,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend error:", resendResult);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendResult.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
