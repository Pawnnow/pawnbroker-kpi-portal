ALTER TABLE public.user_field_labels
  ADD COLUMN planner_mode text NOT NULL DEFAULT 'full';

ALTER TABLE public.user_field_labels
  ADD CONSTRAINT user_field_labels_planner_mode_check
  CHECK (planner_mode IN ('full', 'condensed'));

ALTER TABLE public.user_field_labels
  DROP CONSTRAINT user_field_labels_user_id_field_name_key;

ALTER TABLE public.user_field_labels
  ADD CONSTRAINT user_field_labels_user_field_mode_key
  UNIQUE (user_id, field_name, planner_mode);

COMMENT ON COLUMN public.user_field_labels.planner_mode IS
  'Separates custom labels used by Full and Condensed manual upload views.';