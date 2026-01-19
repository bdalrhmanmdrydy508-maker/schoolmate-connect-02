-- Create storage bucket for teacher files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('teacher-files', 'teacher-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for teachers to upload files
CREATE POLICY "Teachers can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'teacher-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for teachers to view their own files
CREATE POLICY "Teachers can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for admins to view all files
CREATE POLICY "Admins can view all teacher files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'teacher-files' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Create policy for teachers to delete their own files
CREATE POLICY "Teachers can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'teacher-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create table for storing teacher personal files metadata
CREATE TABLE IF NOT EXISTS public.teacher_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_files ENABLE ROW LEVEL SECURITY;

-- Teachers can view own files
CREATE POLICY "Teachers can view own files metadata"
ON public.teacher_files
FOR SELECT
USING (
  teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  )
);

-- Teachers can insert own files
CREATE POLICY "Teachers can insert own files metadata"
ON public.teacher_files
FOR INSERT
WITH CHECK (
  teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  )
);

-- Teachers can delete own files
CREATE POLICY "Teachers can delete own files metadata"
ON public.teacher_files
FOR DELETE
USING (
  teacher_id IN (
    SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
  )
);

-- Admins can view all teacher files
CREATE POLICY "Admins can view all teacher files metadata"
ON public.teacher_files
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create table for user settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  language TEXT DEFAULT 'ar',
  font_size TEXT DEFAULT 'medium',
  theme TEXT DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can view own settings
CREATE POLICY "Users can view own settings"
ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own settings
CREATE POLICY "Users can insert own settings"
ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own settings
CREATE POLICY "Users can update own settings"
ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();