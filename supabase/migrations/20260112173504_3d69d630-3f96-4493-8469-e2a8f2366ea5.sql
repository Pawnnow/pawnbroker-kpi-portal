-- Add user_name and must_change_password columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN user_name text UNIQUE;

ALTER TABLE public.profiles 
ADD COLUMN must_change_password boolean DEFAULT false;

-- Add RLS policy for admins to read all profiles
CREATE POLICY "Admins can read all profiles" 
ON public.profiles FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));