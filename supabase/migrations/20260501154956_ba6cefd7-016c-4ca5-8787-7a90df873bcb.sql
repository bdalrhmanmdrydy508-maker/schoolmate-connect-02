
-- Academic year archive: stores a JSONB snapshot of an academic year's data (read-only)
CREATE TABLE public.academic_archives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  academic_year TEXT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_academic_archives_admin ON public.academic_archives(admin_id);
CREATE INDEX idx_academic_archives_year ON public.academic_archives(academic_year);

ALTER TABLE public.academic_archives ENABLE ROW LEVEL SECURITY;

-- Only admins can view their own archives
CREATE POLICY "Admins can view own archives"
ON public.academic_archives
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND admin_id IN (SELECT id FROM public.admin_profiles WHERE user_id = auth.uid())
);

-- Only admins can insert archives for themselves
CREATE POLICY "Admins can insert own archives"
ON public.academic_archives
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND admin_id IN (SELECT id FROM public.admin_profiles WHERE user_id = auth.uid())
);

-- No UPDATE / DELETE policies => archive is strictly read-only after creation
