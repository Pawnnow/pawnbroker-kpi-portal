-- Add group column to profiles table (0-5 for user grouping)
ALTER TABLE public.profiles
ADD COLUMN "group" integer DEFAULT 0;

-- Add constraint to ensure group is between 0 and 5
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_group_check CHECK ("group" >= 0 AND "group" <= 5);

-- Add is_frozen column to profiles table for account freeze functionality
ALTER TABLE public.profiles
ADD COLUMN is_frozen boolean DEFAULT false;