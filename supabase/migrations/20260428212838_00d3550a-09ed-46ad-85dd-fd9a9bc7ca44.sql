
-- 1) Rename Google Reviews label
UPDATE public.kpi_field_config
SET field_label = 'New Google Reviews'
WHERE field_name = 'num_google_reviews';

-- 2) Insert new consolidated Ending Merchandise Inventory field
INSERT INTO public.kpi_field_config (field_name, category, field_label, is_visible, is_required, display_order, column_group)
VALUES ('ending_merchandise_inventory', 'merchandise', 'Ending Merchandise Inventory', true, true, 14, 'merchandise_performance')
ON CONFLICT (field_name) DO UPDATE
  SET field_label = EXCLUDED.field_label,
      is_visible = EXCLUDED.is_visible,
      is_required = EXCLUDED.is_required,
      column_group = EXCLUDED.column_group;

-- 3) Hide the four legacy inventory fields and clear their required flag
UPDATE public.kpi_field_config
SET is_visible = false, is_required = false
WHERE field_name IN ('merch_inventory','buy_inventory','layaway_inventory','scrap_inventory');
