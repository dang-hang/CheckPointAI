-- Create writing_prompts table
CREATE TABLE public.writing_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  rubric TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  time_limit INTEGER NOT NULL DEFAULT 45,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create writing_submissions table
CREATE TABLE public.writing_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.writing_prompts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ai_feedback TEXT,
  ai_grade NUMERIC(5,2),
  teacher_grade NUMERIC(5,2),
  teacher_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ai_graded', 'teacher_reviewed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.writing_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for writing_prompts
CREATE POLICY "Anyone can view writing prompts"
  ON public.writing_prompts
  FOR SELECT
  USING (true);

CREATE POLICY "Teachers can create writing prompts"
  ON public.writing_prompts
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can update writing prompts"
  ON public.writing_prompts
  FOR UPDATE
  USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Teachers can delete writing prompts"
  ON public.writing_prompts
  FOR DELETE
  USING (has_role(auth.uid(), 'teacher'::app_role));

-- RLS Policies for writing_submissions
CREATE POLICY "Students can view their own submissions"
  ON public.writing_submissions
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view all submissions"
  ON public.writing_submissions
  FOR SELECT
  USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Students can create their own submissions"
  ON public.writing_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Teachers can update submissions"
  ON public.writing_submissions
  FOR UPDATE
  USING (has_role(auth.uid(), 'teacher'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_writing_prompts_updated_at
  BEFORE UPDATE ON public.writing_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_writing_submissions_updated_at
  BEFORE UPDATE ON public.writing_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();