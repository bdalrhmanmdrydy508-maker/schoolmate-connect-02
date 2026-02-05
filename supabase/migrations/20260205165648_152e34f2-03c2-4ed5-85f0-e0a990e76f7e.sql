-- Add duration column to lessons table
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS duration text;

-- Add comment for documentation
COMMENT ON COLUMN public.lessons.duration IS 'Lesson duration (e.g., 45 minutes, 1 hour 30 minutes)';