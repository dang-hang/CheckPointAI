-- Step 1: Create function to strip answers from questions JSONB
CREATE OR REPLACE FUNCTION public.strip_answers_from_questions(questions_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Strip correctAnswer and explanation from each question
  RETURN (
    SELECT jsonb_agg(
      jsonb_strip_nulls(
        question - 'correctAnswer' - 'explanation'
      )
    )
    FROM jsonb_array_elements(questions_data) AS question
  );
END;
$$;

-- Step 2: Create function to strip answers from parts JSONB
CREATE OR REPLACE FUNCTION public.strip_answers_from_parts(parts_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF parts_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Strip correctAnswer and explanation from questions within each part
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', part->>'id',
        'title', part->>'title',
        'context', part->>'context',
        'questions', public.strip_answers_from_questions(part->'questions')
      )
    )
    FROM jsonb_array_elements(parts_data) AS part
  );
END;
$$;

-- Step 3: Create a public view that excludes answers
CREATE OR REPLACE VIEW public.tests_public AS
SELECT 
  id,
  category,
  title,
  description,
  duration,
  difficulty,
  created_at,
  updated_at,
  -- Strip answers from questions if they exist
  CASE 
    WHEN questions IS NOT NULL THEN public.strip_answers_from_questions(questions)
    ELSE NULL
  END as questions,
  -- Strip answers from parts if they exist
  CASE 
    WHEN parts IS NOT NULL THEN public.strip_answers_from_parts(parts)
    ELSE NULL
  END as parts
FROM public.tests;

-- Step 4: Remove the overly permissive public policy from tests table
DROP POLICY IF EXISTS "Anyone can view tests" ON public.tests;

-- Step 5: Create restricted policy - only admins can view full tests with answers
CREATE POLICY "Only admins can view full tests with answers"
ON public.tests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 6: Grant SELECT on the public view to anonymous and authenticated users
GRANT SELECT ON public.tests_public TO anon, authenticated;

COMMENT ON VIEW public.tests_public IS 'Public view of tests with answers and explanations removed for security';
COMMENT ON FUNCTION public.strip_answers_from_questions IS 'Strips correctAnswer and explanation fields from questions JSONB';
COMMENT ON FUNCTION public.strip_answers_from_parts IS 'Strips correctAnswer and explanation fields from parts JSONB';