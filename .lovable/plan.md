

# Show "Founders" in API Export Data

## Problem
The API export (`kpi-export` backend function) outputs the raw group number (e.g., `1`) instead of the label `"Founders"` for group 1 users. Since this data feeds into Excel dashboards, the group column should show human-readable labels.

## Solution
Add a `getGroupLabel` helper directly in the `kpi-export` edge function (since it can't import frontend code) and apply it in both the pivot and long export formats.

## Changes

### 1. Update `supabase/functions/kpi-export/index.ts`
- Add a small helper function at the top:
  ```typescript
  const getGroupLabel = (group: number | null): string => {
    const g = group ?? 0;
    return g === 1 ? "Founders" : `Group ${g}`;
  };
  ```
- Update both pivot format (line 329) and long format (line 374) to output `group: getGroupLabel(profile?.group ?? null)` instead of the raw number.

### 2. Redeploy the edge function
The `kpi-export` function will need to be redeployed for the change to take effect.

## Impact
- API responses will show `"Founders"` for group 1 and `"Group 0"`, `"Group 2"`, etc. for others
- Excel dashboards using AVERAGEIFS on the group column will need to reference `"Founders"` instead of `1` -- worth noting if existing dashboards rely on numeric group values
