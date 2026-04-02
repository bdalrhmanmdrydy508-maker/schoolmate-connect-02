-- Add lesson type and homework-specific fields to lessons table
ALTER TABLE public.lessons 
ADD COLUMN lesson_type text DEFAULT 'lesson',
ADD COLUMN homework_submission_date date,
ADD COLUMN homework_return_date date;