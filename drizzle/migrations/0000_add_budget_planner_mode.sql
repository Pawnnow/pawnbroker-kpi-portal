ALTER TABLE public.budget_cells ADD COLUMN IF NOT EXISTS planner_mode text NOT NULL DEFAULT 'full';
ALTER TABLE public.budget_year_settings ADD COLUMN IF NOT EXISTS planner_mode text NOT NULL DEFAULT 'full';
ALTER TABLE public.budget_categories ADD COLUMN IF NOT EXISTS planner_mode text NOT NULL DEFAULT 'full';

ALTER TABLE public.budget_cells ADD CONSTRAINT budget_cells_planner_mode_check CHECK (planner_mode IN ('full', 'condensed'));
ALTER TABLE public.budget_year_settings ADD CONSTRAINT budget_year_settings_planner_mode_check CHECK (planner_mode IN ('full', 'condensed'));
ALTER TABLE public.budget_categories ADD CONSTRAINT budget_categories_planner_mode_check CHECK (planner_mode IN ('full', 'condensed'));

DROP INDEX IF EXISTS public.budget_cells_unique;
DROP INDEX IF EXISTS public.idx_budget_cells_unique;
DROP INDEX IF EXISTS public.budget_year_settings_unique;
DROP INDEX IF EXISTS public.idx_budget_year_settings_unique;
DROP INDEX IF EXISTS public.budget_categories_unique;

CREATE UNIQUE INDEX budget_cells_mode_unique ON public.budget_cells (user_id, location_id, year, month, category_key, scenario, planner_mode) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX budget_year_settings_mode_unique ON public.budget_year_settings (user_id, location_id, year, scenario, planner_mode) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX budget_categories_mode_unique ON public.budget_categories (user_id, location_id, category_key, planner_mode) NULLS NOT DISTINCT;