-- Create timetables table for class schedules
CREATE TABLE public.timetables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 4), -- 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday
  time_slot TEXT NOT NULL, -- e.g., "08:00", "09:00", etc.
  subject_name TEXT,
  teacher_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(section_id, day_of_week, time_slot)
);

-- Create students table for class student lists
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  date_of_birth DATE,
  place_of_birth TEXT,
  is_repeater BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on both tables
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Timetable policies: Teachers with accepted assignments can manage timetables for their sections
CREATE POLICY "Teachers can view timetables for their assigned sections"
ON public.timetables
FOR SELECT
USING (
  section_id IN (
    SELECT ta.section_id FROM public.teacher_assignments ta
    JOIN public.teacher_profiles tp ON ta.teacher_id = tp.id
    WHERE tp.user_id = auth.uid() AND ta.status = 'accepted'
  )
);

CREATE POLICY "Teachers can insert timetables for their assigned sections"
ON public.timetables
FOR INSERT
WITH CHECK (
  section_id IN (
    SELECT ta.section_id FROM public.teacher_assignments ta
    JOIN public.teacher_profiles tp ON ta.teacher_id = tp.id
    WHERE tp.user_id = auth.uid() AND ta.status = 'accepted'
  )
);

CREATE POLICY "Teachers can update timetables for their assigned sections"
ON public.timetables
FOR UPDATE
USING (
  section_id IN (
    SELECT ta.section_id FROM public.teacher_assignments ta
    JOIN public.teacher_profiles tp ON ta.teacher_id = tp.id
    WHERE tp.user_id = auth.uid() AND ta.status = 'accepted'
  )
);

CREATE POLICY "Teachers can delete timetables for their assigned sections"
ON public.timetables
FOR DELETE
USING (
  section_id IN (
    SELECT ta.section_id FROM public.teacher_assignments ta
    JOIN public.teacher_profiles tp ON ta.teacher_id = tp.id
    WHERE tp.user_id = auth.uid() AND ta.status = 'accepted'
  )
);

CREATE POLICY "Admins can manage all timetables"
ON public.timetables
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Students policies: Teachers with accepted assignments can manage students for their sections
CREATE POLICY "Teachers can view students for their assigned sections"
ON public.students
FOR SELECT
USING (
  section_id IN (
    SELECT ta.section_id FROM public.teacher_assignments ta
    JOIN public.teacher_profiles tp ON ta.teacher_id = tp.id
    WHERE tp.user_id = auth.uid() AND ta.status = 'accepted'
  )
);

CREATE POLICY "Teachers can insert students for their assigned sections"
ON public.students
FOR INSERT
WITH CHECK (
  section_id IN (
    SELECT ta.section_id FROM public.teacher_assignments ta
    JOIN public.teacher_profiles tp ON ta.teacher_id = tp.id
    WHERE tp.user_id = auth.uid() AND ta.status = 'accepted'
  )
);

CREATE POLICY "Teachers can update students for their assigned sections"
ON public.students
FOR UPDATE
USING (
  section_id IN (
    SELECT ta.section_id FROM public.teacher_assignments ta
    JOIN public.teacher_profiles tp ON ta.teacher_id = tp.id
    WHERE tp.user_id = auth.uid() AND ta.status = 'accepted'
  )
);

CREATE POLICY "Teachers can delete students for their assigned sections"
ON public.students
FOR DELETE
USING (
  section_id IN (
    SELECT ta.section_id FROM public.teacher_assignments ta
    JOIN public.teacher_profiles tp ON ta.teacher_id = tp.id
    WHERE tp.user_id = auth.uid() AND ta.status = 'accepted'
  )
);

CREATE POLICY "Admins can manage all students"
ON public.students
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_timetables_updated_at
BEFORE UPDATE ON public.timetables
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();