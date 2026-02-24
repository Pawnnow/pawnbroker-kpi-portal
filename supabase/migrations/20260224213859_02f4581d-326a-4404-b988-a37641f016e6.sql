
-- 1. Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_code TEXT NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS on locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for locations
CREATE POLICY "Users can view own locations"
  ON public.locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all locations"
  ON public.locations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert locations"
  ON public.locations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update locations"
  ON public.locations FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete locations"
  ON public.locations FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Add location_id to kpi_entries (nullable)
ALTER TABLE public.kpi_entries
  ADD COLUMN location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

-- 5. Drop old unique constraint
ALTER TABLE public.kpi_entries
  DROP CONSTRAINT kpi_entries_user_year_month_field_unique;

-- 6. Create new unique index with COALESCE for nullable location_id
CREATE UNIQUE INDEX kpi_entries_user_location_year_month_field_unique
  ON public.kpi_entries (
    user_id,
    COALESCE(location_id, '00000000-0000-0000-0000-000000000000'),
    year,
    month,
    field_name
  );
