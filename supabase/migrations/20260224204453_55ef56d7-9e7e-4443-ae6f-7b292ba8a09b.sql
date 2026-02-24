
-- Remove the old single grid-level toggle for aged inventory
DELETE FROM public.kpi_field_config WHERE field_name = 'aged_inventory_grid';

-- Insert per-column toggles for aged inventory grid
INSERT INTO public.kpi_field_config (field_name, category, field_label, is_visible, display_order) VALUES
  ('aged_col_total_num', 'aged_inventory', 'Total #', true, 1),
  ('aged_col_total_dollar', 'aged_inventory', 'Total $', true, 2),
  ('aged_col_jewelry', 'aged_inventory', 'Jewelry', true, 3),
  ('aged_col_electronics', 'aged_inventory', 'Electronics', true, 4),
  ('aged_col_tools', 'aged_inventory', 'Tools', true, 5),
  ('aged_col_musical', 'aged_inventory', 'Musical', true, 6),
  ('aged_col_games', 'aged_inventory', 'Games', true, 7),
  ('aged_col_firearms', 'aged_inventory', 'Firearms', true, 8),
  ('aged_col_coins_bullion', 'aged_inventory', 'Coins Bullion', true, 9),
  ('aged_col_other', 'aged_inventory', 'Other', true, 10);
