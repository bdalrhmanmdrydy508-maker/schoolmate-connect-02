
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  teacher_profile_id UUID NOT NULL,
  section_id UUID NOT NULL,
  subject_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view own notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view own notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (teacher_profile_id IN (
  SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Teachers can update own notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (teacher_profile_id IN (
  SELECT id FROM teacher_profiles WHERE user_id = auth.uid()
));
