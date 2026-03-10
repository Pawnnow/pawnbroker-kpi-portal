
-- Create shared_files table
CREATE TABLE public.shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  subcategory TEXT,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can view shared files"
ON public.shared_files FOR SELECT TO authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert shared files"
ON public.shared_files FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete shared files"
ON public.shared_files FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('shared-files', 'shared-files', true);

-- Storage RLS: authenticated can read
CREATE POLICY "Authenticated users can read shared files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'shared-files');

-- Storage RLS: admins can upload
CREATE POLICY "Admins can upload shared files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shared-files' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Storage RLS: admins can delete
CREATE POLICY "Admins can delete shared files from storage"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shared-files' AND public.has_role(auth.uid(), 'admin'::app_role));
