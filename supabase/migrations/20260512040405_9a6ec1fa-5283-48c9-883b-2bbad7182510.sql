
-- Add currency column to kpi_entries
ALTER TABLE public.kpi_entries
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

-- Backfill currency from existing metadata rows (per user/location/year/month)
UPDATE public.kpi_entries e
SET currency = COALESCE(m.field_value, 'USD')
FROM public.kpi_entries m
WHERE m.category = 'metadata'
  AND m.field_name = 'currency'
  AND m.user_id = e.user_id
  AND m.year = e.year
  AND m.month = e.month
  AND (m.location_id IS NOT DISTINCT FROM e.location_id)
  AND e.category <> 'metadata';

-- Delete metadata rows now that currency lives on each entry
DELETE FROM public.kpi_entries
WHERE category = 'metadata' AND field_name = 'currency';
