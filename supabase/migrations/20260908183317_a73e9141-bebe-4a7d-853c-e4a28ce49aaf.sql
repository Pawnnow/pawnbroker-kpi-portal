ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS software_platform text NOT NULL DEFAULT 'other';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_software_platform_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_software_platform_check
  CHECK (software_platform IN ('pawnmate', 'other'));

CREATE TABLE IF NOT EXISTS public.user_field_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  field_name text NOT NULL,
  label text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, field_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_field_labels TO authenticated;
GRANT ALL ON public.user_field_labels TO service_role;

ALTER TABLE public.user_field_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own field labels"
  ON public.user_field_labels FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all field labels"
  ON public.user_field_labels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_field_labels_updated_at
  BEFORE UPDATE ON public.user_field_labels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();