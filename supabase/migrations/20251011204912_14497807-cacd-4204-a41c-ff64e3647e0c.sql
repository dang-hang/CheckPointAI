-- Create exam_parts table (categories/sections for documents)
CREATE TABLE IF NOT EXISTS public.exam_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  exam_type text NOT NULL, -- 'Checkpoint', 'IGCSE', 'IELTS', 'General English'
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create exam_documents table
CREATE TABLE IF NOT EXISTS public.exam_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  part_id uuid NOT NULL REFERENCES public.exam_parts(id) ON DELETE CASCADE,
  file_path text NOT NULL, -- Path in storage bucket
  file_name text NOT NULL,
  file_size bigint,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_exam_parts_exam_type ON public.exam_parts(exam_type);
CREATE INDEX idx_exam_parts_order ON public.exam_parts(display_order);
CREATE INDEX idx_exam_documents_part_id ON public.exam_documents(part_id);

-- Enable RLS
ALTER TABLE public.exam_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_parts
-- Everyone can view parts
CREATE POLICY "Anyone can view exam parts"
ON public.exam_parts
FOR SELECT
TO authenticated
USING (true);

-- Only admins can create parts
CREATE POLICY "Admins can create exam parts"
ON public.exam_parts
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update parts
CREATE POLICY "Admins can update exam parts"
ON public.exam_parts
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete parts
CREATE POLICY "Admins can delete exam parts"
ON public.exam_parts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for exam_documents
-- Everyone can view documents
CREATE POLICY "Anyone can view exam documents"
ON public.exam_documents
FOR SELECT
TO authenticated
USING (true);

-- Only admins can upload documents
CREATE POLICY "Admins can upload exam documents"
ON public.exam_documents
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update documents
CREATE POLICY "Admins can update exam documents"
ON public.exam_documents
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete documents
CREATE POLICY "Admins can delete exam documents"
ON public.exam_documents
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on exam_parts
CREATE TRIGGER update_exam_parts_updated_at
BEFORE UPDATE ON public.exam_parts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for updated_at on exam_documents
CREATE TRIGGER update_exam_documents_updated_at
BEFORE UPDATE ON public.exam_documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for exam documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exam-documents', 'exam-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for exam documents
CREATE POLICY "Authenticated users can view exam documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'exam-documents');

CREATE POLICY "Admins can upload exam documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exam-documents' 
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can update exam documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'exam-documents' 
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can delete exam documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'exam-documents' 
  AND (SELECT has_role(auth.uid(), 'admin'::app_role))
);

-- Add comments
COMMENT ON TABLE public.exam_parts IS 'Categories/sections for organizing exam documents';
COMMENT ON TABLE public.exam_documents IS 'Documents and study materials for exam preparation';
COMMENT ON COLUMN public.exam_documents.file_path IS 'Path to file in storage bucket';