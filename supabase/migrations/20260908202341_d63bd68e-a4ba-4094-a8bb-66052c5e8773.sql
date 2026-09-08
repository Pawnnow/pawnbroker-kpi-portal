CREATE TABLE public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX budget_categories_unique ON public.budget_categories (user_id, location_id, category_key) NULLS NOT DISTINCT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_categories TO authenticated;
GRANT ALL ON public.budget_categories TO service_role;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budget categories" ON public.budget_categories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all budget categories" ON public.budget_categories FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_budget_categories_updated_at BEFORE UPDATE ON public.budget_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.budget_year_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  fica_rate NUMERIC NOT NULL DEFAULT 0.0765,
  futa_suta_rate NUMERIC NOT NULL DEFAULT 0,
  tax_rate_state NUMERIC NOT NULL DEFAULT 0,
  tax_rate_county NUMERIC NOT NULL DEFAULT 0,
  tax_rate_city NUMERIC NOT NULL DEFAULT 0,
  starting_cash NUMERIC NOT NULL DEFAULT 0,
  beginning_inventory NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX budget_year_settings_unique ON public.budget_year_settings (user_id, location_id, year) NULLS NOT DISTINCT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_year_settings TO authenticated;
GRANT ALL ON public.budget_year_settings TO service_role;
ALTER TABLE public.budget_year_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budget year settings" ON public.budget_year_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all budget year settings" ON public.budget_year_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_budget_year_settings_updated_at BEFORE UPDATE ON public.budget_year_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.budget_cells (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  category_key TEXT NOT NULL,
  value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX budget_cells_unique ON public.budget_cells (user_id, location_id, year, month, category_key) NULLS NOT DISTINCT;
CREATE INDEX budget_cells_lookup ON public.budget_cells (user_id, year);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_cells TO authenticated;
GRANT ALL ON public.budget_cells TO service_role;
ALTER TABLE public.budget_cells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budget cells" ON public.budget_cells FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all budget cells" ON public.budget_cells FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_budget_cells_updated_at BEFORE UPDATE ON public.budget_cells FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.budget_actuals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  category_key TEXT NOT NULL,
  value NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX budget_actuals_unique ON public.budget_actuals (user_id, location_id, year, month, category_key) NULLS NOT DISTINCT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_actuals TO authenticated;
GRANT ALL ON public.budget_actuals TO service_role;
ALTER TABLE public.budget_actuals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own budget actuals" ON public.budget_actuals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all budget actuals" ON public.budget_actuals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_budget_actuals_updated_at BEFORE UPDATE ON public.budget_actuals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();