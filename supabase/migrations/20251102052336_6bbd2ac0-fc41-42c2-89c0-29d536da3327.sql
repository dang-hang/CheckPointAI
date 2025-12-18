-- Fix 1: Restrict profiles table access to prevent PII exposure
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Teachers can view profiles of students in their classes
CREATE POLICY "Teachers can view student profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  OR EXISTS (
    SELECT 1 FROM student_class sc
    JOIN teacher_class tc ON sc.class_id = tc.class_id
    WHERE sc.student_id = profiles.id
    AND tc.teacher_id = auth.uid()
  )
);

-- Students can view profiles of classmates
CREATE POLICY "Students can view classmate profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM student_class sc1
    JOIN student_class sc2 ON sc1.class_id = sc2.class_id
    WHERE sc1.student_id = auth.uid()
    AND sc2.student_id = profiles.id
  )
);

-- Fix 2: Update storage bucket policies from 'admin' to 'teacher' role
-- Drop old admin-based policies
DROP POLICY IF EXISTS "Admins can upload exam documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update exam documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete exam documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view exam documents" ON storage.objects;

-- Create teacher-based policies for exam-documents bucket
CREATE POLICY "Teachers can upload exam documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-documents' 
  AND has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Teachers can update exam documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exam-documents' 
  AND has_role(auth.uid(), 'teacher'::app_role)
);

CREATE POLICY "Teachers can delete exam documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exam-documents' 
  AND has_role(auth.uid(), 'teacher'::app_role)
);

-- Allow authenticated users to view exam documents
CREATE POLICY "Authenticated users can view exam documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'exam-documents');