-- Add audio_file_path column to tests table
ALTER TABLE public.tests 
ADD COLUMN IF NOT EXISTS audio_file_path text;

-- Add audio_file_path column to tests_public view (rebuild view)
DROP VIEW IF EXISTS public.tests_public;

CREATE VIEW public.tests_public AS
SELECT 
  id,
  category,
  title,
  description,
  difficulty,
  duration,
  audio_file_path,
  created_at,
  updated_at,
  CASE 
    WHEN parts IS NOT NULL THEN 
      jsonb_build_array(
        jsonb_set(
          parts::jsonb,
          '{0,questions}',
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', q->>'id',
              'type', q->>'type',
              'question', q->>'question',
              'options', q->'options'
            )
          )
          FROM jsonb_array_elements((parts::jsonb)->0->'questions') AS q)
        )
      )
    ELSE NULL
  END AS parts,
  CASE 
    WHEN questions IS NOT NULL THEN 
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', q->>'id',
          'type', q->>'type',
          'question', q->>'question',
          'options', q->'options'
        )
      )
      FROM jsonb_array_elements(questions::jsonb) AS q)
    ELSE NULL
  END AS questions
FROM public.tests;

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-audio', 'test-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policy for teachers to upload audio files
CREATE POLICY "Teachers can upload audio files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'test-audio' AND
  (SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'teacher'
  ))
);

-- Create RLS policy for teachers to update audio files
CREATE POLICY "Teachers can update audio files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'test-audio' AND
  (SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'teacher'
  ))
);

-- Create RLS policy for teachers to delete audio files
CREATE POLICY "Teachers can delete audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'test-audio' AND
  (SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'teacher'
  ))
);

-- Create RLS policy for everyone to view audio files
CREATE POLICY "Anyone can view audio files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'test-audio');