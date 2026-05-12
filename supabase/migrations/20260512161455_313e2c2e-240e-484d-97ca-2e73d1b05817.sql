-- Update the field_label for cogs in kpi_field_config
UPDATE public.kpi_field_config
SET field_label = 'COGS for Retail'
WHERE field_name = 'cogs' AND field_label = 'COGS';

-- Update the field_label for cogs in kpi_field_config history if any
-- (most systems only have one row per field_name, but this ensures completeness)
UPDATE public.kpi_field_config
SET field_label = 'COGS for Retail'
WHERE field_name = 'cogs' AND field_label != 'COGS for Retail';