

# Reinstate Dashboard Charts + Reformat My Entries

## Overview

Two changes to the Client Dashboard (`/dashboard`):

1. **Add tabs**: "My Entries" and "Dashboard" (charts) as two tabs on the same page
2. **Reformat "My Entries"**: Display entries grouped into the same 3-column KPI layout used on the upload page (Pawn / Merchandise / Marketing columns + Aged Inventory grid + Pawn Balance grid), instead of the current flat table

## Technical Approach

### 1. Add Tabs to ClientDashboard

- Import `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from the existing tabs component
- Wrap the main content area in a `Tabs` component with two tabs:
  - **"My Entries"** (default) — the existing entry viewer, reformatted
  - **"Dashboard"** — the chart content currently in `KpiDashboard.tsx` (summary cards, pawn balance trend line chart, monthly performance bar chart, marketing pie chart, date range picker)
- The Dashboard tab will import and use `useKpiData` hook and the same chart logic from `KpiDashboard.tsx` — I'll embed the chart content directly into the tab rather than importing the page component, to avoid the duplicate header/logout

### 2. Reformat "My Entries" Tab

Currently entries are displayed as a flat table grouped by category. Instead:

- Group entries by category just like the upload page
- Display **Pawn / Merchandise / Marketing** fields in a 3-column grid layout, each field showing its label and value (read-only display with edit/delete actions)
- Display **Aged Inventory** and **Pawn Balance** entries in their respective grid formats
- Keep the existing edit-inline and delete functionality
- Use the same `CATEGORY_ORDER` and field groupings

### 3. Route Cleanup

- The `/admin/charts` route for admin-only chart access stays as-is
- No new routes needed — everything lives on `/dashboard`

### Files Changed

- **`src/pages/ClientDashboard.tsx`** — Major rewrite: add tabs, embed chart content from KpiDashboard, reformat entries into upload-page-style layout
- No other files need changes

