-- Lesson types catalog
CREATE TABLE public.lesson_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lesson_types TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lesson_types TO authenticated;
GRANT ALL ON public.lesson_types TO service_role;
ALTER TABLE public.lesson_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_types readable by authenticated" ON public.lesson_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "lesson_types insert by admin" ON public.lesson_types FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lesson_types update by admin" ON public.lesson_types FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "lesson_types delete by admin" ON public.lesson_types FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Subject scoping (stage / stream)
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS level_id uuid REFERENCES public.levels(id) ON DELETE SET NULL;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Subject <-> lesson type mapping
CREATE TABLE public.subject_lesson_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  lesson_type_id uuid NOT NULL REFERENCES public.lesson_types(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, lesson_type_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_lesson_types TO authenticated;
GRANT ALL ON public.subject_lesson_types TO service_role;
ALTER TABLE public.subject_lesson_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slt readable by authenticated" ON public.subject_lesson_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "slt insert by admin" ON public.subject_lesson_types FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "slt update by admin" ON public.subject_lesson_types FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "slt delete by admin" ON public.subject_lesson_types FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_slt_subject ON public.subject_lesson_types(subject_id, order_index);

-- Teacher subject binding
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS level_id uuid REFERENCES public.levels(id) ON DELETE SET NULL;
ALTER TABLE public.teacher_profiles ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Lessons keep the subject they belong to
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS level_id uuid REFERENCES public.levels(id) ON DELETE SET NULL;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Server side guard: lesson type must belong to the teacher's subject
CREATE OR REPLACE FUNCTION public.validate_lesson_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject uuid;
  v_level uuid;
  v_branch uuid;
  v_ok boolean;
BEGIN
  SELECT subject_id, level_id, branch_id INTO v_subject, v_level, v_branch
  FROM public.teacher_profiles WHERE id = NEW.teacher_id;

  IF v_subject IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.subject_id := COALESCE(NEW.subject_id, v_subject);
  NEW.level_id := COALESCE(NEW.level_id, v_level);
  NEW.branch_id := COALESCE(NEW.branch_id, v_branch);

  IF NEW.lesson_type IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subject_lesson_types WHERE subject_id = v_subject) THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.subject_lesson_types slt
    JOIN public.lesson_types lt ON lt.id = slt.lesson_type_id
    WHERE slt.subject_id = v_subject AND lt.code = NEW.lesson_type
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'نوع الحصة غير مرتبط بمادة الأستاذ';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_lesson_type_trigger
BEFORE INSERT OR UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.validate_lesson_type();
