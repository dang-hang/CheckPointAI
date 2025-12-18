-- Update RLS policies for existing tables to use teacher instead of admin

-- exam_parts policies
DROP POLICY IF EXISTS "Admins can create exam parts" ON public.exam_parts;
DROP POLICY IF EXISTS "Admins can delete exam parts" ON public.exam_parts;
DROP POLICY IF EXISTS "Admins can update exam parts" ON public.exam_parts;

CREATE POLICY "Teachers can create exam parts"
  ON public.exam_parts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can delete exam parts"
  ON public.exam_parts FOR DELETE
  USING (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update exam parts"
  ON public.exam_parts FOR UPDATE
  USING (has_role(auth.uid(), 'teacher'));

-- exam_documents policies
DROP POLICY IF EXISTS "Admins can delete exam documents" ON public.exam_documents;
DROP POLICY IF EXISTS "Admins can update exam documents" ON public.exam_documents;
DROP POLICY IF EXISTS "Admins can upload exam documents" ON public.exam_documents;

CREATE POLICY "Teachers can delete exam documents"
  ON public.exam_documents FOR DELETE
  USING (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update exam documents"
  ON public.exam_documents FOR UPDATE
  USING (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can upload exam documents"
  ON public.exam_documents FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'teacher'));

-- tests policies
DROP POLICY IF EXISTS "Admins can create tests" ON public.tests;
DROP POLICY IF EXISTS "Admins can delete tests" ON public.tests;
DROP POLICY IF EXISTS "Admins can update tests" ON public.tests;
DROP POLICY IF EXISTS "Only admins can view full tests with answers" ON public.tests;

CREATE POLICY "Teachers can create tests"
  ON public.tests FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can delete tests"
  ON public.tests FOR DELETE
  USING (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can update tests"
  ON public.tests FOR UPDATE
  USING (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Only teachers can view full tests with answers"
  ON public.tests FOR SELECT
  USING (has_role(auth.uid(), 'teacher'));

-- user_roles policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Teachers can manage roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'teacher'));