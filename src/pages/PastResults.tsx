import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, MessageSquare, ArrowLeft, BookOpen, FileEdit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TestResult {
  id: string;
  test_title: string;
  test_category: string;
  score: number;
  total_questions: number;
  percentage: number;
  ai_analysis: string;
  completed_at: string;
  type: 'test';
}

interface WritingResult {
  id: string;
  prompt_id: string;
  content: string;
  word_count: number;
  submitted_at: string;
  ai_feedback: string | null;
  ai_grade: number | null;
  teacher_grade: number | null;
  teacher_notes: string | null;
  status: string;
  writing_prompts: {
    title: string;
  };
  type: 'writing';
}

type Result = TestResult | WritingResult;

const PastResults = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch test results
      const { data: testData, error: testError } = await supabase
        .from("test_results")
        .select("*")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false });

      if (testError) throw testError;

      // Fetch writing submissions
      const { data: writingData, error: writingError } = await supabase
        .from("writing_submissions")
        .select("*, writing_prompts(title)")
        .eq("student_id", user.id)
        .order("submitted_at", { ascending: false });

      if (writingError) throw writingError;

      // Combine and type the results
      const testResults: TestResult[] = (testData || []).map(t => ({ ...t, type: 'test' as const }));
      const writingResults: WritingResult[] = (writingData || []).map(w => ({ ...w, type: 'writing' as const }));
      
      // Combine and sort by date
      const combined = [...testResults, ...writingResults].sort((a, b) => {
        const dateA = a.type === 'test' ? new Date(a.completed_at) : new Date(a.submitted_at);
        const dateB = b.type === 'test' ? new Date(b.completed_at) : new Date(b.submitted_at);
        return dateB.getTime() - dateA.getTime();
      });

      setResults(combined);
    } catch (error: any) {
      console.error("Error fetching results:", error);
      toast({
        title: "Error",
        description: "Unable to load test history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-secondary";
    return "text-destructive";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />

      <main className="container mx-auto px-4 py-12">
        {results.length === 0 ? (
          <Card className="max-w-2xl mx-auto text-center shadow-soft">
            <CardContent className="py-12">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Results Yet</h2>
              <p className="text-muted-foreground mb-6">
                You haven't completed any tests yet. Start practicing now!
              </p>
              <Button onClick={() => navigate("/practice")}>
                Go to Practice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Your Results</h2>
              <p className="text-muted-foreground">
                Review completed tests and AI analysis
              </p>
            </div>

            {results.map((result) => {
              const isWriting = result.type === 'writing';
              const writingResult = isWriting ? (result as WritingResult) : null;
              const testResult = !isWriting ? (result as TestResult) : null;
              
              return (
                <Card key={result.id} className="hover:shadow-elegant transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">
                            {isWriting ? (
                              <span className="flex items-center gap-1">
                                <FileEdit className="w-3 h-3" />
                                Writing
                              </span>
                            ) : (
                              testResult!.test_category
                            )}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {formatDate(isWriting ? writingResult!.submitted_at : testResult!.completed_at)}
                          </div>
                        </div>
                        <CardTitle className="text-xl">
                          {isWriting ? writingResult!.writing_prompts.title : testResult!.test_title}
                        </CardTitle>
                        {isWriting && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <Badge variant="outline">{writingResult!.word_count} words</Badge>
                            <Badge 
                              className={
                                writingResult!.status === 'teacher_reviewed' 
                                  ? 'bg-green-500' 
                                  : writingResult!.status === 'ai_graded' 
                                  ? 'bg-blue-500' 
                                  : 'bg-gray-500'
                              }
                            >
                              {writingResult!.status === 'teacher_reviewed' 
                                ? 'Reviewed' 
                                : writingResult!.status === 'ai_graded' 
                                ? 'AI Graded' 
                                : 'Pending'}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {isWriting ? (
                          <>
                            {writingResult!.teacher_grade !== null ? (
                              <>
                                <div className="text-3xl font-bold text-primary">
                                  {writingResult!.teacher_grade.toFixed(0)}
                                </div>
                                <div className="text-sm text-muted-foreground">Teacher Grade</div>
                              </>
                            ) : writingResult!.ai_grade !== null ? (
                              <>
                                <div className="text-3xl font-bold text-blue-500">
                                  {writingResult!.ai_grade.toFixed(0)}
                                </div>
                                <div className="text-sm text-muted-foreground">AI Grade</div>
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground">Pending</div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className={`text-3xl font-bold ${getScoreColor(testResult!.percentage)}`}>
                              {testResult!.percentage.toFixed(0)}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {testResult!.score}/{testResult!.total_questions}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full gap-2">
                          <MessageSquare className="w-4 h-4" />
                          {isWriting ? 'View Feedback' : 'View AI Analysis'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>
                            {isWriting ? 'Writing Feedback' : 'AI Analysis'}
                          </DialogTitle>
                          <DialogDescription>
                            {isWriting ? writingResult!.writing_prompts.title : testResult!.test_title}
                          </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[60vh] pr-4">
                          {isWriting ? (
                            <div className="space-y-6">
                              <div>
                                <h4 className="font-semibold mb-2">Your Writing ({writingResult!.word_count} words):</h4>
                                <div className="bg-muted p-4 rounded-lg">
                                  <p className="whitespace-pre-wrap text-sm">{writingResult!.content}</p>
                                </div>
                              </div>
                              
                              {writingResult!.ai_feedback && (
                                <div>
                                  <h4 className="font-semibold mb-2">AI Feedback (Grade: {writingResult!.ai_grade}/100):</h4>
                                  <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown>{writingResult!.ai_feedback}</ReactMarkdown>
                                  </div>
                                </div>
                              )}
                              
                              {writingResult!.teacher_notes && (
                                <div>
                                  <h4 className="font-semibold mb-2">Teacher Feedback (Grade: {writingResult!.teacher_grade}/100):</h4>
                                  <div className="bg-primary/5 p-4 rounded-lg">
                                    <p className="whitespace-pre-wrap text-sm">{writingResult!.teacher_notes}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            testResult!.ai_analysis && (
                              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                                {testResult!.ai_analysis}
                              </div>
                            )
                          )}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PastResults;
