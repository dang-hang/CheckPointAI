-- Drop and recreate the tests_public view to fix JSON extraction error
DROP VIEW IF EXISTS tests_public;

CREATE VIEW tests_public AS
SELECT 
  id,
  category,
  title,
  description,
  difficulty,
  duration,
  created_at,
  updated_at,
  audio_file_path,
  -- Strip answers from questions if they exist
  CASE 
    WHEN questions IS NOT NULL THEN public.strip_answers_from_questions(questions)
    ELSE NULL
  END AS questions,
  -- Strip answers from parts if they exist
  CASE 
    WHEN parts IS NOT NULL THEN public.strip_answers_from_parts(parts)
    ELSE NULL
  END AS parts
FROM tests;