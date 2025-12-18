-- Create test_results table to store student test history
CREATE TABLE public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  test_title TEXT NOT NULL,
  test_category TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL NOT NULL,
  answers JSONB NOT NULL,
  ai_analysis TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own test results
CREATE POLICY "Users can view their own test results"
ON public.test_results
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own test results
CREATE POLICY "Users can insert their own test results"
ON public.test_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_test_results_user_id ON public.test_results(user_id);
CREATE INDEX idx_test_results_completed_at ON public.test_results(completed_at DESC);