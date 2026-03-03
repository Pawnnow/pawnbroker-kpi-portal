
-- Drop the old unique index/constraint on kpi_entries
DROP INDEX IF EXISTS kpi_entries_user_id_year_month_field_name_idx;
DROP INDEX IF EXISTS idx_kpi_entries_unique;

-- Create new unique index that includes location_id (using COALESCE for NULL handling)
CREATE UNIQUE INDEX kpi_entries_user_location_period_field_idx
  ON public.kpi_entries (user_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid), year, month, field_name);
