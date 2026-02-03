-- Add status column to teacher_profiles for approval workflow
ALTER TABLE public.teacher_profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing teachers to 'approved' status (backward compatibility)
UPDATE public.teacher_profiles SET status = 'approved' WHERE status IS NULL OR status = 'pending';

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_status ON public.teacher_profiles(status);

-- Update the teacher SELECT policy to include status check for login
-- Drop existing policy and recreate with status check
DROP POLICY IF EXISTS "Teachers can view own profile" ON public.teacher_profiles;
CREATE POLICY "Teachers can view own profile" 
ON public.teacher_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admin needs to see all teacher profiles including pending ones
DROP POLICY IF EXISTS "Admins can view teacher profiles" ON public.teacher_profiles;
CREATE POLICY "Admins can view teacher profiles" 
ON public.teacher_profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can update teacher status (approve/reject)
DROP POLICY IF EXISTS "Admins can update teacher status" ON public.teacher_profiles;
CREATE POLICY "Admins can update teacher status" 
ON public.teacher_profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));