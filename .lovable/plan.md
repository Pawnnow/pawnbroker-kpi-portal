

# Fix 365+ Days Required Field Highlighting

## Problem

In the `DataGrid` component, the green required-field background is applied to the `<td>` cell, but the `<Input>` element inside it has its own opaque background that covers the cell color. In contrast, `KpiInputColumn` applies the green background directly to the `<Input>` element, making it visible.

## Fix

**`src/components/kpi/DataGrid.tsx`** — Move the inline `backgroundColor` style from the `<td>` element to the `<Input>` element inside it, matching how `KpiInputColumn` handles required fields.

- Remove the `style` prop from the `<td>` on line 64
- Add the same `style` prop to the `<Input>` on line 66, conditioned on `isCellRequired`

This ensures the input field itself shows the green background (`rgba(16, 216, 6, 0.15)`), consistent with how required fields look in the KPI input columns.

