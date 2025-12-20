import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getMonthName = (month: number): string => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[month - 1] || "";
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const apiKey = url.searchParams.get('api_key');
    const yearFilter = url.searchParams.get('year');
    const monthFilter = url.searchParams.get('month');
    const categoryFilter = url.searchParams.get('category');

    if (!apiKey) {
      console.log('Missing API key in request');
      return new Response(
        JSON.stringify({ error: 'API key is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the API key to compare with stored hash
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('Looking up API key...');

    // Look up the API key
    const { data: keyRecord, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, is_active')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !keyRecord) {
      console.log('Invalid API key:', keyError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!keyRecord.is_active) {
      console.log('API key is inactive');
      return new Response(
        JSON.stringify({ error: 'API key has been revoked' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id);

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', keyRecord.user_id)
      .eq('role', 'admin')
      .single();

    const isAdmin = !!roleData;
    console.log(`User is admin: ${isAdmin}`);

    // Build the query
    let query = supabase
      .from('kpi_entries')
      .select('year, month, category, field_name, field_label, field_value, user_id, created_at');

    // If not admin, scope to user's own data
    if (!isAdmin) {
      query = query.eq('user_id', keyRecord.user_id);
    }

    // Apply optional filters
    if (yearFilter) {
      query = query.eq('year', parseInt(yearFilter));
    }
    if (monthFilter) {
      query = query.eq('month', parseInt(monthFilter));
    }
    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }

    // Order results
    query = query.order('year', { ascending: false })
                 .order('month', { ascending: false })
                 .order('category')
                 .order('field_name');

    const { data: kpiData, error: kpiError } = await query;

    if (kpiError) {
      console.error('Error fetching KPI data:', kpiError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If admin, fetch user emails for identification
    let userEmails: Record<string, string> = {};
    if (isAdmin && kpiData && kpiData.length > 0) {
      const userIds = [...new Set(kpiData.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);
      
      if (profiles) {
        profiles.forEach(p => {
          userEmails[p.id] = p.email || 'Unknown';
        });
      }
    }

    // Format response
    const formattedData = kpiData?.map(row => ({
      year: row.year,
      month: row.month,
      month_name: getMonthName(row.month),
      category: row.category,
      field_name: row.field_name,
      field_label: row.field_label,
      field_value: row.field_value,
      ...(isAdmin && { 
        user_id: row.user_id,
        user_email: userEmails[row.user_id] || 'Unknown'
      })
    }));

    const response = {
      data: formattedData,
      meta: {
        total: formattedData?.length || 0,
        fetched_at: new Date().toISOString(),
        is_admin_view: isAdmin,
        filters: {
          year: yearFilter || null,
          month: monthFilter || null,
          category: categoryFilter || null
        }
      }
    };

    console.log(`Returning ${formattedData?.length || 0} records`);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in kpi-export function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
