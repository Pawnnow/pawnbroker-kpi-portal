import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      console.log('User auth error:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Check if user has an active API key
      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('id, name, created_at, last_used_at, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (keyError && keyError.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error checking API key:', keyError);
        return new Response(
          JSON.stringify({ error: 'Failed to check API key status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          hasActiveKey: !!keyData,
          keyInfo: keyData ? {
            name: keyData.name,
            created_at: keyData.created_at,
            last_used_at: keyData.last_used_at
          } : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      // Generate a new API key
      console.log('Generating new API key for user:', user.id);

      // First, revoke any existing active keys
      await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Generate a secure random key
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const plainKey = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Hash the key for storage
      const encoder = new TextEncoder();
      const data = encoder.encode(plainKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Store the hashed key
      const { error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          key_hash: keyHash,
          name: 'Excel Integration',
          is_active: true
        });

      if (insertError) {
        console.error('Error storing API key:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate API key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build the export URL
      const exportUrl = `${supabaseUrl}/functions/v1/kpi-export?api_key=${plainKey}`;

      console.log('API key generated successfully');

      return new Response(
        JSON.stringify({ 
          success: true,
          apiKey: plainKey,
          exportUrl: exportUrl,
          message: 'API key generated. This key will only be shown once!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE') {
      // Revoke all active API keys for this user
      console.log('Revoking API keys for user:', user.id);

      const { error: deleteError } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (deleteError) {
        console.error('Error revoking API key:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to revoke API key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'API key revoked successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in manage-api-key function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
