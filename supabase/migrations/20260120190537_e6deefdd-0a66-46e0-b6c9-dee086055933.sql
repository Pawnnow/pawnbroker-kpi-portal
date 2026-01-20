-- Add unique constraint to enable upsert logic for KPI entries
ALTER TABLE public.kpi_entries 
ADD CONSTRAINT kpi_entries_user_year_month_field_unique 
UNIQUE (user_id, year, month, field_name);