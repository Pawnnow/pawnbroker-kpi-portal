
## Fix Power Query Export Missing Months (Jan, Feb, Mar)

### Problem
The `kpi-export` edge function is hitting Supabase's 1,000-row default limit, causing months 1-3 (January, February, March) to be excluded from exports. The logs show "Returning 9 records (format: wide)" instead of all 12 months.

### Root Cause
The query in the edge function (lines 153-179) doesn't specify a limit or use pagination, so Supabase applies its default 1,000-row cap.

### Solution
Apply the same batched pagination approach used in the admin dashboard to the edge function. This will fetch all KPI entries in 1,000-row batches.

---

### File Change

**`supabase/functions/kpi-export/index.ts`**

#### 1. Add pagination helper function (after line 74)

```typescript
const BATCH_SIZE = 1000;

async function fetchAllKpiEntries(
  supabase: any,
  userId: string | null,
  isAdmin: boolean,
  yearFilter: string | null,
  monthFilter: string | null,
  categoryFilter: string | null
) {
  let allData: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('kpi_entries')
      .select('year, month, category, field_name, field_label, field_value, user_id, created_at');

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
```

#### 2. Replace the single query with the pagination function (lines 152-187)

Replace:
```typescript
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
```

With:
```typescript
// Fetch all KPI entries using pagination to bypass 1000-row limit
let kpiData: any[];
try {
  kpiData = await fetchAllKpiEntries(
    supabase,
    keyRecord.user_id,
    isAdmin,
    yearFilter,
    monthFilter,
    categoryFilter
  );
} catch (kpiError) {
  console.error('Error fetching KPI data:', kpiError);
  return new Response(
    JSON.stringify({ error: 'Failed to fetch data' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

console.log(`Fetched ${kpiData.length} total entries`);
```

---

### Technical Details

| Aspect | Before | After |
|--------|--------|-------|
| Query limit | 1,000 rows (default) | Unlimited (batched) |
| Months exported | 9 (Apr-Dec only) | 12 (all months) |
| Scalability | Breaks at 1,000 entries | Handles 300,000+ entries |

### After Implementation
Power Query exports will include all 12 months (January through December), and the system will scale to support 60+ clients with 36 months of data each.
