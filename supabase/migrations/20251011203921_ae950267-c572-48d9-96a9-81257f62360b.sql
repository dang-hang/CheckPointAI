-- Create test_sessions table for just-in-time access control
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '2 hours',
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_test_sessions_user_test ON public.test_sessions(user_id, test_id);
CREATE INDEX idx_test_sessions_expires ON public.test_sessions(expires_at) WHERE completed = false;

-- Enable RLS on test_sessions
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own test sessions
CREATE POLICY "Users can view their own test sessions"
ON public.test_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own test sessions
CREATE POLICY "Users can create their own test sessions"
ON public.test_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own test sessions
CREATE POLICY "Users can update their own test sessions"
ON public.test_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Drop the existing tests_public view
DROP VIEW IF EXISTS public.tests_public;

-- Recreate tests_public view with session-based access control
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
    WHEN t.questions IS NOT NULL THEN strip_answers_from_questions(t.questions)
    ELSE NULL::jsonb
  END AS questions,
  CASE
    WHEN t.parts IS NOT NULL THEN strip_answers_from_parts(t.parts)
    ELSE NULL::jsonb
  END AS parts
FROM public.tests t
WHERE EXISTS (
  SELECT 1 FROM public.test_sessions ts
  WHERE ts.user_id = auth.uid()
    AND ts.test_id = t.id
    AND ts.completed = false
    AND ts.expires_at > now()
)
OR has_role(auth.uid(), 'admin'::app_role);

-- Add comment explaining the security model
COMMENT ON TABLE public.test_sessions IS 'Tracks active test-taking sessions. Users can only access test questions when they have an active session.';
COMMENT ON VIEW public.tests_public IS 'Secure view of tests with answers stripped. Access restricted to users with active test sessions or admins.';