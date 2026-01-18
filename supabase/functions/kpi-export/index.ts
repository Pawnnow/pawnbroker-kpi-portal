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

// Convert numeric strings to actual numbers for Excel compatibility
const parseNumericValue = (value: string | null): string | number | null => {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }
  
  const trimmed = value.trim();
  
  // Check if it contains currency, percentage, or other non-numeric formatting
  if (/[$%€£¥]/.test(trimmed) || /[a-zA-Z]/.test(trimmed)) {
    return trimmed;
  }
  
  // Remove commas and try to parse as number
  const cleanedValue = trimmed.replace(/,/g, '');
  const parsed = parseFloat(cleanedValue);
  
  // Return as number if it's a valid number, otherwise return original string
  if (!isNaN(parsed) && isFinite(parsed) && cleanedValue === parsed.toString()) {
    return parsed;
  }
  
  // Handle cases like "1234.56" or "-500" that parseFloat handles correctly
  if (!isNaN(parsed) && isFinite(parsed)) {
    // Verify it was a clean numeric string (with optional commas)
    if (/^-?[\d,]+\.?\d*$/.test(trimmed)) {
      return parsed;
    }
  }
  
  return trimmed;
};

// Define ALL expected KPI columns to ensure consistent export structure
// These match the field_labels in the KPI upload form (with $ → Dollar, # → Num)
const ALL_KPI_COLUMNS = [
  // Pawn KPIs
  "Ending Pawn Balance", "Num Pawns at End of Month", "Dollar Pawns Written", 
  "Num Pawns Written", "Dollar Pawns Redeemed", "Num Pawns Redeemed",
  "Dollar Pawns Forfeited", "Num Pawns Forfeited", "Dollar Pickups",
  "Num Pickups", "Dollar Extensions", "Dollar Renewals",
  // Retail Sales KPIs
  "Total Retail Sales", "Dollar Margin",
  // Purchases KPIs
  "General Mdse Purchases", "Scrap Purchases",
  // Marketing KPIs
  "Text Marketing", "Social Media Ads FB Google", "Print Marketing",
  "Radio Marketing", "TV Marketing", "Website", "Consulting",
  "Total Marketing Spent",
  // Aged Inventory KPIs
  "Dollar 0 to 90 Days", "Num 0 to 90 Days", "Dollar 91 to 180 Days",
  "Num 91 to 180 Days", "Dollar 181 to 270 Days", "Num 181 to 270 Days",
  "Dollar 271 to 365 Days", "Num 271 to 365 Days", "Dollar 1 Year Plus",
  "Num 1 Year Plus",
  // Pawn Balance By Type KPIs
  "Dollar General Mdse", "Num General Mdse", "Dollar Jewelry",
  "Num Jewelry", "Dollar Firearms", "Num Firearms",
  "Dollar Tools", "Num Tools", "Dollar Electronics", "Num Electronics",
  // Merchandise Inventory KPIs
  "Merch Inventory", "Layaway Inventory", "Scrap Inventory"
];

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
    const format = url.searchParams.get('format') || 'long'; // 'long' (default) or 'wide'

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

    // Format response based on requested format
    let responseData;
    
    if (format === 'wide') {
      // Pivot data to wide format: one row per user/year/month with ALL KPI fields from all categories
      const pivotMap = new Map<string, Record<string, any>>();
      
      kpiData?.forEach(row => {
        // Group by user/year/month only (not category) so all KPIs appear in one row
        const key = isAdmin 
          ? `${row.user_id}-${row.year}-${row.month}`
          : `${row.year}-${row.month}`;
        
        if (!pivotMap.has(key)) {
          // Initialize base row with metadata
          const baseRow: Record<string, any> = {
            year: row.year,
            month: row.month,
            month_name: getMonthName(row.month),
            ...(isAdmin && { 
              user_id: String(row.user_id),
              user_email: userEmails[row.user_id] || 'Unknown'
            })
          };
          
          // Pre-populate ALL KPI columns with null to ensure consistent structure
          ALL_KPI_COLUMNS.forEach(col => {
            baseRow[col] = null;
          });
          
          pivotMap.set(key, baseRow);
        }
        
        // Add field value as a column using field_label as column name
        const record = pivotMap.get(key)!;
        // Clean the label to make it a valid column name
        // Replace $ and # with text equivalents first to avoid collisions (e.g., "$ Pawns Written" vs "# Pawns Written")
        const columnName = row.field_label
          .replace(/\$/g, 'Dollar ')
          .replace(/#/g, 'Num ')
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .trim();
        // Convert numeric values for Excel compatibility
        record[columnName] = parseNumericValue(row.field_value);
      });
      
      responseData = Array.from(pivotMap.values());
    } else {
      // Long format (default) - convert numeric values
      responseData = kpiData?.map(row => ({
        year: row.year,
        month: row.month,
        month_name: getMonthName(row.month),
        category: row.category,
        field_name: row.field_name,
        field_label: row.field_label,
        field_value: parseNumericValue(row.field_value),
        ...(isAdmin && { 
          user_id: String(row.user_id),
          user_email: userEmails[row.user_id] || 'Unknown'
        })
      }));
    }

    const response = {
      data: responseData,
      meta: {
        total: responseData?.length || 0,
        fetched_at: new Date().toISOString(),
        is_admin_view: isAdmin,
        format: format,
        filters: {
          year: yearFilter || null,
          month: monthFilter || null,
          category: categoryFilter || null
        }
      }
    };

    console.log(`Returning ${responseData?.length || 0} records (format: ${format})`);

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
