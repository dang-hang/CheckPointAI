import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, MessageSquare, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Question {
  id: string;
  type: "multiple-choice" | "fill-blank" | "true-false";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface Part {
  id: string;
  title: string;
  context?: string;
  questions: Question[];
}

interface Test {
  id: string;
  category: string;
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  questions?: Question[]; // Legacy format
  parts?: Part[]; // New format
  audio_file_path?: string | null;
}

const TestTaking = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Convert legacy format to parts format
  const testParts: Part[] = test?.parts || (test?.questions && Array.isArray(test.questions) ? [{
    id: "part-1",
    title: "Questions",
    questions: test.questions
  }] : []);
  
  const allQuestions = testParts.flatMap(part => part.questions || []);
  const currentPart = testParts[currentPartIndex];
  
  // Check if test has valid question data
  const hasValidQuestions = testParts.length > 0 && testParts.some(part => part.questions && part.questions.length > 0);

  useEffect(() => {
    loadTest();
  }, [testId]);

  const loadTest = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to take tests",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Create test session to grant access to test questions
      const { error: sessionError } = await supabase
        .from("test_sessions")
        .insert({
          user_id: user.id,
          test_id: testId,
        });

      if (sessionError) {
        console.error("Error creating test session:", sessionError);
        toast({
          title: "Unable to start test",
          description: "Please try again",
          variant: "destructive",
        });
        navigate("/practice");
        return;
      }

      // Now fetch the test with full data including answers (user has active session)
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("id", testId)
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        toast({
          title: "Test not found",
          variant: "destructive",
        });
        navigate("/practice");
        return;
      }

      setTest(data as unknown as Test);
      setTimeLeft(data.duration * 60);
      setTimerStarted(true);
      
      // Load audio file if present
      if (data.audio_file_path) {
        const { data: audioData } = supabase.storage
          .from('test-audio')
          .getPublicUrl(data.audio_file_path);
        
        if (audioData) {
          setAudioUrl(audioData.publicUrl);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading test:", error);
      setLoading(false);
      toast({
        title: "Error loading test",
        variant: "destructive",
      });
      navigate("/practice");
    }
  };

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !showResults && timerStarted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResults && timerStarted) {
      handleSubmit();
    }
  }, [timeLeft, showResults, timerStarted]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading test...</h2>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Test not found</h2>
          <Button onClick={() => navigate("/practice")}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!hasValidQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h2 className="text-2xl font-bold mb-4">Invalid Test Format</h2>
          <p className="text-muted-foreground mb-6">
            This test has an incompatible data structure and cannot be displayed. 
            Please contact the test administrator.
          </p>
          <Button onClick={() => navigate("/practice")}>Go Back</Button>
        </div>
      </div>
    );
  }

  const progress = ((currentPartIndex + 1) / testParts.length) * 100;

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNextPart = () => {
    if (currentPartIndex < testParts.length - 1) {
      setCurrentPartIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousPart = () => {
    if (currentPartIndex > 0) {
      setCurrentPartIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    // Mark test session as completed
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("test_sessions")
        .update({ completed: true })
        .eq("user_id", user.id)
        .eq("test_id", test.id)
        .eq("completed", false);
    }
    
    toast({
      title: "Validating answers...",
      description: "Please wait",
    });

    try {
      // Validate answers server-side
      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        "validate-test-answers",
        {
          body: {
            testId: test.id,
            userAnswers: answers,
          },
        }
      );

      if (validationError) throw validationError;

      const { score, totalQuestions, results } = validationData;
      
      // Store validation results in state BEFORE showing results
      setValidationResults(results);

      toast({
        title: "Analyzing results...",
        description: "AI is evaluating your performance",
      });

      // Get AI analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-test-results",
        {
          body: {
            testTitle: test.title,
            score,
            totalQuestions,
            questions: results.map((r: any) => ({
              id: r.questionId,
              question: r.question,
              correctAnswer: r.correctAnswer,
            })),
            userAnswers: answers,
          },
        }
      );

      if (analysisError) {
        console.error("AI analysis error:", analysisError);
        // Continue even if AI analysis fails
      }

      // Save to database
      if (user) {
        const { error: saveError } = await supabase.from("test_results").insert({
          user_id: user.id,
          test_id: test.id,
          test_title: test.title,
          test_category: test.category,
          score,
          total_questions: totalQuestions,
          percentage: validationData.percentage,
          answers,
          ai_analysis: analysisData?.analysis,
        });

        if (saveError) {
          console.error("Error saving results:", saveError);
          toast({
            title: "Unable to save results",
            description: "But you can still view the analysis",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Complete!",
            description: `You scored ${score}/${totalQuestions} correct. Results saved.`,
          });
        }
      }

      setAiAnalysis(analysisData?.analysis || null);
      
      // Only show results AFTER all data is ready
      setShowResults(true);
    } catch (error: any) {
      console.error("Error analyzing results:", error);
      toast({
        title: "Analysis Error",
        description: "Unable to get AI analysis",
        variant: "destructive",
      });
    }
  };

  const calculateScore = () => {
    return validationResults.filter((r: any) => r.isCorrect).length;
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "Loading...";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showResults) {
    const score = calculateScore();
    const percentage = (score / allQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-hero">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/practice")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Test Results</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="shadow-elegant mb-8">
            <CardHeader className="text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <CardTitle className="text-3xl">You're Done!</CardTitle>
              <CardDescription className="text-xl">
                Score: {score}/{allQuestions.length} ({percentage.toFixed(0)}%)
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-6 mb-8">
            <h3 className="text-2xl font-bold">Detailed Answers</h3>
            {validationResults.map((result: any, index: number) => {
              const userAnswer = result.userAnswer;
              const isCorrect = result.isCorrect;

              return (
                <Card key={result.questionId} className={isCorrect ? "border-green-500" : "border-destructive"}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                      <Badge variant={isCorrect ? "default" : "destructive"}>
                        {isCorrect ? "Correct" : "Incorrect"}
                      </Badge>
                    </div>
                    <CardDescription className="text-base text-foreground">
                      {result.question}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Your answer:</p>
                      <p className={isCorrect ? "text-green-600" : "text-destructive"}>
                        {userAnswer || "(No answer)"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Correct answer:</p>
                      <p className="text-green-600">{result.correctAnswer}</p>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-muted-foreground">Explanation:</p>
                      <p>{result.explanation}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {aiAnalysis && (
            <Card className="shadow-soft mb-8 border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-primary" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {aiAnalysis}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 flex gap-4 justify-center">
            <Button onClick={() => navigate("/practice")} variant="outline">
              Back to List
            </Button>
            <Button onClick={() => window.location.reload()}>
              Retake Test
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/practice")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">{test.title}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm md:text-base">
            <Clock className="w-5 h-5 text-primary" />
            <span className={timeLeft !== null && timeLeft < 60 ? "text-destructive font-bold" : ""}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <div className="flex justify-between mb-2 text-sm text-muted-foreground">
            <span>Part {currentPartIndex + 1} of {testParts.length}</span>
            <span>{progress.toFixed(0)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {audioUrl && (
          <Card className="shadow-elegant mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Listening Audio
              </CardTitle>
              <CardDescription>
                Listen to the audio before answering the questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <audio
                ref={audioRef}
                controls
                className="w-full"
                src={audioUrl}
              >
                Your browser does not support the audio element.
              </audio>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-elegant mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{currentPart?.title || "Questions"}</CardTitle>
            {currentPart?.context && (
              <CardDescription className="text-base text-foreground whitespace-pre-wrap mt-4">
                {currentPart.context}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-8">
            {(currentPart?.questions || []).map((question, qIndex) => (
              <div key={question.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                <h3 className="font-semibold text-lg mb-3">
                  Question {qIndex + 1}
                </h3>
                <p className="mb-4 text-foreground">{question.question}</p>

                {question.type === "multiple-choice" && question.options && (
                  <RadioGroup
                    value={answers[question.id] || ""}
                    onValueChange={(value) => handleAnswer(question.id, value)}
                  >
                    <div className="space-y-2">
                      {question.options.map((option, oIndex) => (
                        <div
                          key={oIndex}
                          className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                        >
                          <RadioGroupItem value={option} id={`q${qIndex}-option-${oIndex}`} />
                          <Label
                            htmlFor={`q${qIndex}-option-${oIndex}`}
                            className="flex-1 cursor-pointer"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {question.type === "fill-blank" && (
                  <div>
                    <Label htmlFor={`answer-${question.id}`} className="text-sm mb-2 block">
                      Your answer:
                    </Label>
                    <Input
                      id={`answer-${question.id}`}
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswer(question.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="max-w-md"
                    />
                  </div>
                )}

                {question.type === "true-false" && (
                  <RadioGroup
                    value={answers[question.id] || ""}
                    onValueChange={(value) => handleAnswer(question.id, value)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                        <RadioGroupItem value="True" id={`q${qIndex}-true`} />
                        <Label htmlFor={`q${qIndex}-true`} className="flex-1 cursor-pointer">
                          True
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                        <RadioGroupItem value="False" id={`q${qIndex}-false`} />
                        <Label htmlFor={`q${qIndex}-false`} className="flex-1 cursor-pointer">
                          False
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePreviousPart}
            disabled={currentPartIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous Part
          </Button>

          {currentPartIndex === testParts.length - 1 ? (
            <Button onClick={handleSubmit} className="gap-2">
              Submit Test
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleNextPart}>
              Next Part
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default TestTaking;
