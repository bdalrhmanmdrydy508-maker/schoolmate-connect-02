
-- Allow teachers to manage section_subjects for their assigned sections
CREATE POLICY "Teachers can manage section subjects for assigned sections"
ON public.section_subjects
FOR ALL
TO authenticated
USING (
  section_id IN (
    SELECT ta.section_id
    FROM teacher_assignments ta
    JOIN teacher_profiles tp ON ta.teacher_id = tp.id
    WHERE tp.user_id = auth.uid() AND ta.status = 'accepted'
  )
)
WITH CHECK (
  section_id IN (
    SELECT ta.section_id
    FROM teacher_assignments ta
    JOIN teacher_profiles tp ON ta.teacher_id = tp.id
    WHERE tp.user_id = auth.uid() AND ta.status = 'accepted'
  )
);
