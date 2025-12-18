-- Fix the strip_answers_from_questions function to handle non-array data
CREATE OR REPLACE FUNCTION public.strip_answers_from_questions(questions_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return NULL if input is NULL
  IF questions_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if the data is actually an array
  IF jsonb_typeof(questions_data) != 'array' THEN
    RETURN NULL;
  END IF;
  
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

-- Fix the strip_answers_from_parts function to handle non-array data
CREATE OR REPLACE FUNCTION public.strip_answers_from_parts(parts_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Return NULL if input is NULL
  IF parts_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if the data is actually an array
  IF jsonb_typeof(parts_data) != 'array' THEN
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