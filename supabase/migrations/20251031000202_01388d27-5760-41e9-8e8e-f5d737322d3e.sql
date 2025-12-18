-- Create classes table
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create teacher_class junction table (many-to-many)
CREATE TABLE public.teacher_class (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_id)
);

ALTER TABLE public.teacher_class ENABLE ROW LEVEL SECURITY;

-- Create student_class junction table (many-to-many)
CREATE TABLE public.student_class (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id)
);

ALTER TABLE public.student_class ENABLE ROW LEVEL SECURITY;

-- Create progress_reports table
CREATE TABLE public.progress_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  report_content text NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for classes
CREATE POLICY "Teachers can view their classes"
  ON public.classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_class
      WHERE teacher_class.class_id = classes.id
        AND teacher_class.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their classes"
  ON public.classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_class
      WHERE student_class.class_id = classes.id
        AND student_class.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage classes"
  ON public.classes FOR ALL
  USING (has_role(auth.uid(), 'teacher'));

-- RLS Policies for teacher_class
CREATE POLICY "Teachers can view their class assignments"
  ON public.teacher_class FOR SELECT
  USING (teacher_id = auth.uid() OR has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers can manage teacher class assignments"
  ON public.teacher_class FOR ALL
  USING (has_role(auth.uid(), 'teacher'));

-- RLS Policies for student_class
CREATE POLICY "Students can view their class enrollments"
  ON public.student_class FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view students in their classes"
  ON public.student_class FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_class
      WHERE teacher_class.class_id = student_class.class_id
        AND teacher_class.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can manage student class enrollments"
  ON public.student_class FOR ALL
  USING (has_role(auth.uid(), 'teacher'));

-- RLS Policies for progress_reports
CREATE POLICY "Teachers can view all reports"
  ON public.progress_reports FOR SELECT
  USING (has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students can view their own reports"
  ON public.progress_reports FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can manage all reports"
  ON public.progress_reports FOR ALL
  USING (has_role(auth.uid(), 'teacher'));

-- Add triggers for updated_at
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();