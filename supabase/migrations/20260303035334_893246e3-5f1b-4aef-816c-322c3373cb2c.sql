-- Replace expression-based indexes with a column-based unique index that matches ON CONFLICT
DROP INDEX IF EXISTS public.kpi_entries_user_location_period_field_idx;
DROP INDEX IF EXISTS public.kpi_entries_user_location_year_month_field_unique;

CREATE UNIQUE INDEX IF NOT EXISTS kpi_entries_user_location_year_month_field_unique
ON public.kpi_entries (user_id, location_id, year, month, field_name) NULLS NOT DISTINCT;