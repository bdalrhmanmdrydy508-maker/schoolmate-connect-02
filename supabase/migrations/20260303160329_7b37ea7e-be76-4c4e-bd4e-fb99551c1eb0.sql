
-- Create section_subjects table for per-section subject management
CREATE TABLE public.section_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  teacher_profile_id UUID REFERENCES public.teacher_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section_id, subject_name)
);

-- Enable RLS
ALTER TABLE public.section_subjects ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage section subjects"
ON public.section_subjects FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view subjects for their assigned sections
CREATE POLICY "Teachers can view section subjects"
ON public.section_subjects FOR SELECT
USING (section_id IN (
  SELECT ta.section_id FROM teacher_assignments ta
  JOIN teacher_profiles tp ON ta.teacher_id = tp.id
  WHERE tp.user_id = auth.uid() AND ta.status = 'accepted'
));

-- Trigger for updated_at
CREATE TRIGGER update_section_subjects_updated_at
BEFORE UPDATE ON public.section_subjects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
