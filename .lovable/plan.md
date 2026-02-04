
## Fix Admin Dashboard Query Limit

### Problem
The admin dashboard currently uses Supabase's default 1,000-row limit, causing only 9 of 12 reporting periods to display. With your projected growth to 60 clients × 36 months × ~116 fields = ~250,000 entries, this limit needs to be increased.

### Solution
Add `.limit(300000)` to the KPI entries query in `useAdminKpiData.ts`. This is a valid limit - Supabase/PostgreSQL supports query limits up to millions of rows.

---

### File Change

**`src/hooks/useAdminKpiData.ts`** (lines 30-34)

Change the query from:
```typescript
const { data, error } = await supabase
  .from("kpi_entries")
  .select("*")
  .order("year", { ascending: false })
  .order("month", { ascending: false });
```

To:
```typescript
const { data, error } = await supabase
  .from("kpi_entries")
  .select("*")
  .order("year", { ascending: false })
  .order("month", { ascending: false })
  .limit(300000);
```

---

### Why This Works
- The 1,000-row limit is a client-side default, not a database constraint
- PostgreSQL can handle millions of rows per query
- 300,000 provides ample headroom for 60 clients with 36 months of data each
- No subscription upgrade required - this is simply overriding the default

### After Implementation
All 12 reporting periods will display correctly in the admin dashboard, and the system will scale to accommodate your projected client growth.
