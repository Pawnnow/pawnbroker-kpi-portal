-- Add explicit policy to deny anonymous (unauthenticated) access to profiles table
-- This ensures anonymous users cannot query the profiles table under any circumstance

CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);