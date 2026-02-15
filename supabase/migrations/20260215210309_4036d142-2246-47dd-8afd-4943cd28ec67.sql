
-- Create kpi_field_config table
CREATE TABLE public.kpi_field_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name text UNIQUE NOT NULL,
  category text NOT NULL,
  field_label text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kpi_field_config ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed for upload page)
CREATE POLICY "Authenticated users can read field config"
  ON public.kpi_field_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update field config"
  ON public.kpi_field_config
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_kpi_field_config_updated_at
  BEFORE UPDATE ON public.kpi_field_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Pawn KPIs
INSERT INTO public.kpi_field_config (field_name, category, field_label, display_order) VALUES
  ('ending_pawn_balance', 'pawn', 'Ending Pawn Balance', 1),
  ('num_pawns_end', 'pawn', '# of Pawns at End of Month', 2),
  ('num_pawns_written', 'pawn', '# Pawns Written', 3),
  ('dollar_pawns_written', 'pawn', '$ Pawns Written', 4),
  ('num_pawns_redeemed', 'pawn', '# Pawns Redeemed', 5),
  ('dollar_pawns_redeemed', 'pawn', '$ Pawns Redeemed', 6),
  ('num_pawns_defaulted', 'pawn', '# Pawns Defaulted', 7),
  ('dollar_pawns_defaulted', 'pawn', '$ Pawns Defaulted', 8),
  ('psc_collected', 'pawn', 'PSC Collected', 9),
  ('num_pawns_renewed_30d', 'pawn', '# Pawns Renewed (Past 30 Days)', 10),
  ('dollar_pawns_renewed_30d', 'pawn', '$ Pawns Renewed (Past 30 Days)', 11),
  ('num_buys_30d', 'pawn', '# Buys (Past 30 Days)', 12),
  ('dollar_buys_30d', 'pawn', '$ Buys (Past 30 Days)', 13),
  ('num_active_pawns', 'pawn', '# Active Pawns', 14),
  ('num_pawn_customers', 'pawn', '# Pawn Customers', 15),
  ('unique_pawn_customers', 'pawn', 'Unique Pawn Customers', 16);

-- Seed Merchandise KPIs
INSERT INTO public.kpi_field_config (field_name, category, field_label, display_order) VALUES
  ('layaway_balance', 'merchandise', 'Layaway Balance', 1),
  ('num_active_layaways', 'merchandise', '# Active Layaways', 2),
  ('num_new_layaways', 'merchandise', '# New Layaways Written', 3),
  ('dollar_new_layaways', 'merchandise', '$ New Layaways Written', 4),
  ('num_redeemed_layaways', 'merchandise', '# Redeemed Layaways', 5),
  ('dollar_redeemed_layaways', 'merchandise', '$ Redeemed Layaways', 6),
  ('num_sales_transactions_30d', 'merchandise', '# Sales Transactions (Past 30 Days)', 7),
  ('retail_sales', 'merchandise', 'Retail Sales', 8),
  ('gross_sales', 'merchandise', 'Gross Sales', 9),
  ('cogs', 'merchandise', 'COGS', 10),
  ('gross_profits', 'merchandise', 'Gross Profits', 11),
  ('scrap_sales', 'merchandise', 'Scrap Sales', 12),
  ('cogs_scrap', 'merchandise', 'COGS for Scrap', 13),
  ('merch_inventory', 'merchandise', 'Merch. Inventory', 14),
  ('buy_inventory', 'merchandise', 'Buy Inventory', 15),
  ('layaway_inventory', 'merchandise', 'Layaway Inventory', 16),
  ('scrap_inventory', 'merchandise', 'Scrap Inventory', 17);

-- Seed Marketing KPIs
INSERT INTO public.kpi_field_config (field_name, category, field_label, display_order) VALUES
  ('marketing_text', 'marketing', 'Text Marketing', 1),
  ('marketing_social_media', 'marketing', 'Social Media Ads (FB & Google)', 2),
  ('marketing_print', 'marketing', 'Print Marketing', 3),
  ('marketing_radio', 'marketing', 'Radio Marketing', 4),
  ('marketing_tv', 'marketing', 'TV Marketing', 5),
  ('marketing_website', 'marketing', 'Website', 6),
  ('marketing_consulting', 'marketing', 'Consulting', 7),
  ('total_marketing_spent', 'marketing', 'Total Marketing Spent', 8),
  ('num_google_reviews', 'marketing', '# Google Reviews', 9),
  ('num_buy_customers', 'marketing', '# Buy Customers', 10),
  ('num_retail_customers', 'marketing', '# Retail Customers', 11),
  ('customer_traffic', 'marketing', 'Customer Traffic (Through Door)', 12),
  ('new_customers_30d', 'marketing', 'New Customers (Past 30 Days)', 13),
  ('unique_customers_30d', 'marketing', 'Unique Customers (Past 30 Days)', 14),
  ('unique_customers_365d', 'marketing', 'Unique Customers (Past 365 Days)', 15);

-- Seed grid-level toggles
INSERT INTO public.kpi_field_config (field_name, category, field_label, display_order) VALUES
  ('aged_inventory_grid', 'aged_inventory', 'Aged Inventory Grid', 1),
  ('pawn_balance_grid', 'pawn_balance', 'Pawn Balance Breakdown Grid', 1);
