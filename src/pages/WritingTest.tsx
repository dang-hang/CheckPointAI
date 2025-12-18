import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";

const WritingTest = () => {
  const { promptId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState<any>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [grade, setGrade] = useState<number | null>(null);

  useEffect(() => {
    loadPrompt();
  }, [promptId]);

  useEffect(() => {
    if (timeRemaining > 0 && !feedback) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining, feedback]);

  const loadPrompt = async () => {
    try {
      const { data, error } = await supabase
        .from('writing_prompts')
        .select('*')
        .eq('id', promptId)
        .single();

      if (error) throw error;
      
      setPrompt(data);
      setTimeRemaining(data.time_limit * 60);
    } catch (error: any) {
      console.error('Error loading prompt:', error);
      toast({
        title: "Error",
        description: "Failed to load writing prompt",
        variant: "destructive",
      });
      navigate("/practice-hub");
    } finally {
      setLoading(false);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;

  const handleSubmit = async () => {
    if (wordCount < 50) {
      toast({
        title: "Too Short",
        description: "Your writing must be at least 50 words",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create submission
      const { data: submission, error: insertError } = await supabase
        .from('writing_submissions')
        .insert({
          prompt_id: promptId,
          student_id: user.id,
          content,
          word_count: wordCount,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Submitted!",
        description: "Your writing has been submitted. AI grading in progress...",
      });

      // Call AI grading function
      setGrading(true);
      const { data: gradeData, error: gradeError } = await supabase.functions.invoke('grade-writing', {
        body: { submissionId: submission.id }
      });

      if (gradeError) throw gradeError;

      setFeedback(gradeData.feedback);
      setGrade(gradeData.grade);

      toast({
        title: "Graded!",
        description: `Your writing has been graded: ${gradeData.grade}/100`,
      });

    } catch (error: any) {
      console.error('Error submitting:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit writing",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setGrading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!prompt) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />

      <main className="container mx-auto px-4 py-12">
        {!feedback ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{prompt.title}</CardTitle>
                    <CardDescription className="mt-2">
                      Difficulty: <span className="capitalize">{prompt.difficulty}</span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="w-5 h-5" />
                      <span>{wordCount} words</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span className={timeRemaining < 300 ? "text-destructive font-semibold" : ""}>
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-sm max-w-none">
                  <h3 className="text-lg font-semibold mb-2">Writing Prompt:</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{prompt.prompt}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Your Response:</h3>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Start writing your response here..."
                    className="min-h-[400px] resize-none"
                    disabled={submitting || grading}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || grading || wordCount < 50}
                    className="flex-1"
                  >
                    {submitting || grading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {grading ? "AI Grading..." : "Submitting..."}
                      </>
                    ) : (
                      "Submit Writing"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/practice-hub")}
                    disabled={submitting || grading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Feedback</CardTitle>
                <CardDescription>
                  Grade: <span className="text-2xl font-bold text-primary">{grade}/100</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{feedback}</ReactMarkdown>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-4">
                    This is an AI-generated grade. Your teacher will review your submission and provide a final grade.
                  </p>
                  <Button onClick={() => navigate("/past-results")} className="w-full">
                    View All Submissions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default WritingTest;