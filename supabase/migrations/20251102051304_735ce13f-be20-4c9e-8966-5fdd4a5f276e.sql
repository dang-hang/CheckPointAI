-- Drop the existing view
DROP VIEW IF EXISTS tests_public;

-- Recreate the view with proper logic:
-- Always show stripped questions/parts for browsing (no answers)
-- During active test sessions, still show stripped questions
-- Only admins/teachers can see full tests with answers via the tests table directly
CREATE VIEW tests_public AS
SELECT 
  id,
  category,
  title,
  description,
  duration,
  difficulty,
  created_at,
  updated_at,
  -- Always strip answers from questions (safe for students to browse)
  CASE 
    WHEN questions IS NOT NULL THEN strip_answers_from_questions(questions)
    ELSE NULL
  END AS questions,
  -- Always strip answers from parts (safe for students to browse)
  CASE 
    WHEN parts IS NOT NULL THEN strip_answers_from_parts(parts)
    ELSE NULL
  END AS parts
FROM tests;