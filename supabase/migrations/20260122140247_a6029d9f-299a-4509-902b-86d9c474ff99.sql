-- Add last_profile_update column to admin_profiles
ALTER TABLE public.admin_profiles 
ADD COLUMN IF NOT EXISTS last_profile_update timestamp with time zone DEFAULT NULL;

-- Add last_profile_update column to teacher_profiles
ALTER TABLE public.teacher_profiles 
ADD COLUMN IF NOT EXISTS last_profile_update timestamp with time zone DEFAULT NULL;