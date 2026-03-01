
-- Create teacher_programs table for "My Program" feature
CREATE TABLE public.teacher_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  lesson_number integer NOT NULL,
  lesson_title text NOT NULL,
  unit text,
  status text NOT NULL DEFAULT 'not_taught',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_programs ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own programs
CREATE POLICY "Teachers can manage own programs"
ON public.teacher_programs
FOR ALL
USING (teacher_id IN (
  SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
))
WITH CHECK (teacher_id IN (
  SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
));

-- Admins can view all programs
CREATE POLICY "Admins can view all programs"
ON public.teacher_programs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add unique constraint for ordering
CREATE UNIQUE INDEX teacher_programs_unique_number ON public.teacher_programs (teacher_id, section_id, lesson_number);

-- Store original AI-analyzed program data for autocomplete
CREATE TABLE public.program_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  original_data jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage own templates"
ON public.program_templates
FOR ALL
USING (teacher_id IN (
  SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
))
WITH CHECK (teacher_id IN (
  SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can view all templates"
ON public.program_templates
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
