-- Allow all authenticated users to view tests from the tests table
-- The tests_public view will strip out answers automatically
CREATE POLICY "All authenticated users can view tests"
  ON public.tests
  FOR SELECT
  TO authenticated
  USING (true);