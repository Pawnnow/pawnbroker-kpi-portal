

# Implement "P" Info Bubbles for KPI Fields

Build the info bubble system from scratch, starting with two fields: **Ending Pawn Balance** and **# of Pawns at End of Month**.

## Steps

### 1. Copy images to project
- Copy `user-uploads://endingpawnbalance.jpg` → `public/kpi-info/endingpawnbalance.jpg`
- Copy `user-uploads://pawnsendofmonth.jpg` → `public/kpi-info/pawnsendofmonth.jpg`

### 2. New file: `src/lib/kpiInfoBubbles.ts`
Config map of field_name → image path:
```ts
export const KPI_INFO_IMAGES: Record<string, string> = {
  "ending_pawn_balance": "/kpi-info/endingpawnbalance.jpg",
  "num_pawns_end": "/kpi-info/pawnsendofmonth.jpg",
};
```

### 3. New component: `src/components/kpi/KpiInfoBubble.tsx`
- Takes `fieldName` prop
- Looks up image from `KPI_INFO_IMAGES`; renders nothing if no match
- Renders a small circular "P" badge (inline, ~18px, primary color)
- On click, opens a shadcn `Popover` showing the image

### 4. Edit: `src/components/kpi/KpiInputColumn.tsx`
- Import `KpiInfoBubble`
- Next to each field label, render `<KpiInfoBubble fieldName={field.name} />`

### 5. Edit: `src/pages/ClientDashboard.tsx`
- Same treatment in `renderFieldRow` — add `<KpiInfoBubble />` next to field labels

