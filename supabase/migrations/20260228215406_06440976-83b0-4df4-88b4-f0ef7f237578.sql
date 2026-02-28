
-- Create email_templates table
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text UNIQUE NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  attachment_url text,
  attachment_filename text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can SELECT
CREATE POLICY "Admins can select email templates"
  ON public.email_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Admins can INSERT
CREATE POLICY "Admins can insert email templates"
  ON public.email_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Admins can UPDATE
CREATE POLICY "Admins can update email templates"
  ON public.email_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create email-attachments storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', true);

-- Storage RLS: Anyone can read (so Resend can fetch)
CREATE POLICY "Public read access for email attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'email-attachments');

-- Storage RLS: Admins can upload
CREATE POLICY "Admins can upload email attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'email-attachments' AND public.has_role(auth.uid(), 'admin'));

-- Storage RLS: Admins can update
CREATE POLICY "Admins can update email attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'email-attachments' AND public.has_role(auth.uid(), 'admin'));

-- Storage RLS: Admins can delete
CREATE POLICY "Admins can delete email attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'email-attachments' AND public.has_role(auth.uid(), 'admin'));

-- Seed default welcome template
INSERT INTO public.email_templates (template_type, subject, body_html)
VALUES (
  'welcome',
  'Welcome to Pawnbroker KPI Portal',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a2e;">Welcome to Pawnbroker KPI Portal</h2>
  <p>Hello <strong>{{user_name}}</strong>,</p>
  <p>Your account has been created. Here are your login credentials:</p>
  <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 4px 0;"><strong>Username:</strong> {{user_name}}</p>
    <p style="margin: 4px 0;"><strong>Email:</strong> {{email}}</p>
    <p style="margin: 4px 0;"><strong>Temporary Password:</strong> {{password}}</p>
  </div>
  <p style="color: #e74c3c; font-weight: bold;">You will be required to change your password on first login.</p>
  <p>If you have any questions, please contact your administrator.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="font-size: 12px; color: #888;">Pawnbroker KPI Portal</p>
</div>'
);
