ALTER TABLE public.kpi_field_config
  DROP CONSTRAINT IF EXISTS kpi_field_config_column_group_check;

ALTER TABLE public.kpi_field_config
  ADD CONSTRAINT kpi_field_config_column_group_check
  CHECK (column_group IN ('pawn_performance','merchandise_performance','financial_summary','customer_marketing','income','monthly_expenses'));