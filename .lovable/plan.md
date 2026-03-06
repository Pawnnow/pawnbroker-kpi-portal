

# Make Required Field Highlighting More Vivid

Replace the subtle `bg-emerald-50` / `dark:bg-emerald-950/30` classes with inline styles using `#31F927` (bright green) in three locations:

1. **`src/components/kpi/KpiInputColumn.tsx` (line 55)** — Change the required input background from Tailwind emerald classes to `style={{ backgroundColor: '#31F927' }}` (light) / a vivid green with reduced opacity for dark mode.

2. **`src/components/kpi/DataGrid.tsx` (line 64)** — Same change for required grid cells.

3. **Leave the success banner in `KpiUpload.tsx` (line 850) unchanged** — that's feedback UI, not a required field indicator.

Since `#31F927` isn't a Tailwind preset color, I'll use inline styles with a CSS custom property approach or direct inline `backgroundColor`. For dark mode, I'll use a semi-transparent version (e.g., `rgba(49, 249, 39, 0.2)`) so it doesn't blind users on dark backgrounds.

