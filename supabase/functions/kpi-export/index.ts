import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getGroupLabel = (group: number | null): string => {
  const g = group ?? 0;
  if (g === 0) return "Demo";
  if (g === 1) return "Founders";
  return `Group ${g}`;
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
  // Pawn KPIs (16)
  "Ending Pawn Balance", "Num of Pawns at End of Month",
  "Num Pawns Written", "Dollar Pawns Written",
  "Num Pawns Redeemed", "Dollar Pawns Redeemed",
  "Num Pawns Defaulted", "Dollar Pawns Defaulted",
  "PSC Collected",
  "Num Pawns Renewed", "Dollar Pawns Renewed",
  "Num Buys", "Dollar Buys",
  "Num Active Pawns", "Num Pawn Customers", "Unique Pawn Customers",
  // Merchandise KPIs (19)
  "Layaway Balance", "Num Active Layaways",
  "Num New Layaways Written", "Dollar New Layaways Written",
  "Num Redeemed Layaways", "Dollar Redeemed Layaways",
  "Num Sales Transactions", "Retail Sales",
  "Gross Sales", "COGS", "Gross Profits",
  "Scrap Sales", "COGS for Scrap",
  "Monthly Expenses", "Net Profit",
  "Merch Inventory", "Buy Inventory", "Layaway Inventory", "Scrap Inventory",
  // Marketing KPIs (15)
  "Text Marketing", "Social Media Ads FB  Google", "Print Marketing",
  "Radio Marketing", "TV Marketing", "Website", "Consulting",
  "Total Marketing Spent",
  "Num Google Reviews", "Num Buy Customers", "Num Retail Customers",
  "Customer Traffic Through Door", "New Customers",
  "Unique Customers", "Unique Customers 365 Days",
];

const BATCH_SIZE = 1000;

async function fetchAllKpiEntries(
  supabase: any,
  userId: string | null,
  isAdmin: boolean,
  yearFilter: string | null,
  monthFilter: string | null,
  categoryFilter: string | null,
  storeCodeFilter: string | null,
  locationIdSet: Set<string> | null
) {
  let allData: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('kpi_entries')
      .select('year, month, category, field_name, field_label, field_value, user_id, location_id, created_at');

    // Scope to user if not admin
    if (!isAdmin && userId) {
      query = query.eq('user_id', userId);
    }

    // Apply filters
    if (yearFilter) {
      query = query.eq('year', parseInt(yearFilter));
    }
    if (monthFilter) {
      query = query.eq('month', parseInt(monthFilter));
    }
    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }
    // Filter by location IDs (from store_code filter)
    if (locationIdSet && locationIdSet.size > 0) {
      query = query.in('location_id', Array.from(locationIdSet));
    }

    // Order and paginate
    query = query
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('category')
      .order('field_name')
      .range(offset, offset + BATCH_SIZE - 1);

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      offset += BATCH_SIZE;
      hasMore = data.length === BATCH_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

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
    const storeCodeFilter = url.searchParams.get('store_code');

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

    // If store_code filter, look up matching location IDs first
    let locationIdSet: Set<string> | null = null;
    if (storeCodeFilter) {
      const { data: matchingLocs } = await supabase
        .from('locations')
        .select('id')
        .eq('store_code', storeCodeFilter);
      if (matchingLocs && matchingLocs.length > 0) {
        locationIdSet = new Set(matchingLocs.map((l: any) => l.id));
      } else {
        // No matching location — return empty
        return new Response(
          JSON.stringify({ data: [], meta: { total: 0, fetched_at: new Date().toISOString(), is_admin_view: isAdmin, format, filters: { year: yearFilter, month: monthFilter, category: categoryFilter, store_code: storeCodeFilter } } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch all KPI entries using pagination to bypass 1000-row limit
    let kpiData: any[];
    try {
      kpiData = await fetchAllKpiEntries(
        supabase,
        keyRecord.user_id,
        isAdmin,
        yearFilter,
        monthFilter,
        categoryFilter,
        storeCodeFilter,
        locationIdSet
      );
    } catch (kpiError) {
      console.error('Error fetching KPI data:', kpiError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetched ${kpiData.length} total entries`);

    // If admin, fetch user profiles for identification (email, user_name, group)
    let userProfiles: Record<string, { email: string; user_name: string | null; group: number | null }> = {};
    if (isAdmin && kpiData && kpiData.length > 0) {
      const userIds = [...new Set(kpiData.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, user_name, group')
        .in('id', userIds);
      
      if (profiles) {
        profiles.forEach(p => {
          userProfiles[p.id] = {
            email: p.email || 'Unknown',
            user_name: p.user_name || null,
            group: p.group ?? null
          };
        });
      }
    }

    // Fetch location data for entries that have location_id
    let locationMap: Record<string, { store_code: string; store_name: string }> = {};
    const locationIds = [...new Set(kpiData.filter(d => d.location_id).map(d => d.location_id))];
    if (locationIds.length > 0) {
      const { data: locations } = await supabase
        .from('locations')
        .select('id, store_code, store_name')
        .in('id', locationIds);
      if (locations) {
        locations.forEach((l: any) => {
          locationMap[l.id] = { store_code: l.store_code, store_name: l.store_name };
        });
      }
    }

    // Helper: resolve user_name — use store_code if location exists, else profile user_name
    const resolveUserName = (row: any) => {
      if (row.location_id && locationMap[row.location_id]) {
        return locationMap[row.location_id].store_code;
      }
      return userProfiles[row.user_id]?.user_name || null;
    };

    // Format response based on requested format
    let responseData;
    
    if (format === 'wide') {
      // Pivot data to wide format: one row per user/year/month with ALL KPI fields from all categories
      const pivotMap = new Map<string, Record<string, any>>();
      
      kpiData?.forEach(row => {
        // Group by user/location/year/month so each location gets its own row
        const locationKey = row.location_id || 'none';
        const key = isAdmin 
          ? `${row.user_id}-${locationKey}-${row.year}-${row.month}`
          : `${locationKey}-${row.year}-${row.month}`;
        
        if (!pivotMap.has(key)) {
          const profile = userProfiles[row.user_id];
          const userName = resolveUserName(row);
          const loc = row.location_id ? locationMap[row.location_id] : null;
          // Initialize base row with metadata
          const baseRow: Record<string, any> = {
            year: row.year,
            month: row.month,
            month_name: getMonthName(row.month),
            ...(isAdmin && { 
              user_id: String(row.user_id),
              user_name: userName,
              user_email: profile?.email || 'Unknown',
              group: getGroupLabel(profile?.group ?? null),
              ...(loc && { store_name: loc.store_name })
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
      responseData = kpiData?.map(row => {
        const profile = userProfiles[row.user_id];
        const userName = resolveUserName(row);
        const loc = row.location_id ? locationMap[row.location_id] : null;
        return {
          year: row.year,
          month: row.month,
          month_name: getMonthName(row.month),
          category: row.category,
          field_name: row.field_name,
          field_label: row.field_label,
          field_value: parseNumericValue(row.field_value),
          ...(isAdmin && { 
            user_id: String(row.user_id),
            user_name: userName,
            user_email: profile?.email || 'Unknown',
            group: getGroupLabel(profile?.group ?? null),
            ...(loc && { store_name: loc.store_name })
          })
        };
      });
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
          category: categoryFilter || null,
          store_code: storeCodeFilter || null
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
