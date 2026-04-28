
ALTER TABLE public.kpi_field_config
  ADD COLUMN IF NOT EXISTS column_group text NOT NULL DEFAULT 'pawn_performance';

ALTER TABLE public.kpi_field_config
  DROP CONSTRAINT IF EXISTS kpi_field_config_column_group_check;

ALTER TABLE public.kpi_field_config
  ADD CONSTRAINT kpi_field_config_column_group_check
  CHECK (column_group IN ('pawn_performance','merchandise_performance','financial_summary','customer_marketing'));

-- Pawn Performance
UPDATE public.kpi_field_config SET column_group = 'pawn_performance'
WHERE field_name IN (
  'ending_pawn_balance','num_pawns_end','num_pawns_written','dollar_pawns_written',
  'num_pawns_redeemed','dollar_pawns_redeemed','num_pawns_defaulted','dollar_pawns_defaulted',
  'psc_collected','num_pawns_renewed_30d','dollar_pawns_renewed_30d','num_active_pawns'
);

-- Merchandise Performance
UPDATE public.kpi_field_config SET column_group = 'merchandise_performance'
WHERE field_name IN (
  'layaway_balance','num_active_layaways','num_new_layaways','dollar_new_layaways',
  'num_redeemed_layaways','dollar_redeemed_layaways','num_sales_transactions_30d',
  'retail_sales','scrap_sales','num_buys_30d','dollar_buys_30d',
  'merch_inventory','buy_inventory','layaway_inventory','scrap_inventory'
);

-- Financial Summary
UPDATE public.kpi_field_config SET column_group = 'financial_summary'
WHERE field_name IN (
  'gross_sales','cogs','gross_profits','cogs_scrap','monthly_expenses','net_profit'
);

-- Customer & Marketing
UPDATE public.kpi_field_config SET column_group = 'customer_marketing'
WHERE field_name IN (
  'marketing_text','marketing_social_media','marketing_print','marketing_radio',
  'marketing_tv','marketing_website','marketing_consulting','total_marketing_spent',
  'num_google_reviews','num_pawn_customers','unique_pawn_customers','num_buy_customers',
  'num_retail_customers','customer_traffic','new_customers_30d',
  'unique_customers_30d','unique_customers_365d'
);
