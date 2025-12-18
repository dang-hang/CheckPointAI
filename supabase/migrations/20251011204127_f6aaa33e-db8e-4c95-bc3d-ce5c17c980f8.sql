-- Recreate tests_public view to show metadata to all users, but questions only with active sessions
DROP VIEW IF EXISTS public.tests_public;

CREATE OR REPLACE VIEW public.tests_public
WITH (security_invoker=true)
AS
SELECT 
  t.id,
  t.category,
  t.title,
  t.description,
  t.duration,
  t.difficulty,
  t.created_at,
  t.updated_at,
  CASE
    WHEN (EXISTS (
      SELECT 1 FROM public.test_sessions ts
      WHERE ts.user_id = auth.uid()
        AND ts.test_id = t.id
        AND ts.completed = false
        AND ts.expires_at > now()
    ) OR has_role(auth.uid(), 'admin'::app_role)) 
    AND t.questions IS NOT NULL THEN strip_answers_from_questions(t.questions)
    ELSE NULL::jsonb
  END AS questions,
  CASE
    WHEN (EXISTS (
      SELECT 1 FROM public.test_sessions ts
      WHERE ts.user_id = auth.uid()
        AND ts.test_id = t.id
        AND ts.completed = false
        AND ts.expires_at > now()
    ) OR has_role(auth.uid(), 'admin'::app_role))
    AND t.parts IS NOT NULL THEN strip_answers_from_parts(t.parts)
    ELSE NULL::jsonb
  END AS parts
FROM public.tests t;

-- Add comment explaining the security model
COMMENT ON VIEW public.tests_public IS 'Secure view of tests. Test metadata visible to all authenticated users. Questions/parts only visible to users with active test sessions or admins.';