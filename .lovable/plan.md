

# Fix: Restore LocationManager to Admin Dashboard

The `<LocationManager />` component was accidentally removed from the JSX during the recent reorder (line 416 has the comment but the component is gone).

## Change
**File:** `src/pages/AdminDashboard.tsx` (line 416)

Add `<LocationManager />` back after the comment on line 415:

```tsx
{/* Location Manager */}
<LocationManager />
```

Single line addition, no other changes needed.

