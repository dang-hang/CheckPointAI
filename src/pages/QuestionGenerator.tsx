import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Sparkles, Plus, Trash2, Edit2 } from "lucide-react";

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: number | string;
  explanation: string;
}

const QuestionGenerator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [subject, setSubject] = useState("EFL");
  const [level, setLevel] = useState("Intermediate");
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState("mixed");
  const [category, setCategory] = useState("Reading");
  const [description, setDescription] = useState("");

  // Generated questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Test metadata
  const [testTitle, setTestTitle] = useState("");
  const [testDuration, setTestDuration] = useState(30);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "teacher")
        .single();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "Only teachers can access the question generator.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast({
        title: "Description Required",
        description: "Please provide a description of what questions you want to generate.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          subject,
          level,
          questionCount,
          questionType,
          category,
          description,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setQuestions(data.questions || []);
      setTestTitle(`${subject} - ${level} - ${questionType}`);
      
      toast({
        title: "Questions Generated!",
        description: `Successfully generated ${data.questions?.length || 0} questions. Review and edit before saving.`,
      });
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAsTest = async () => {
    if (questions.length === 0) {
      toast({
        title: "No Questions",
        description: "Please generate questions first.",
        variant: "destructive",
      });
      return;
    }

    if (!testTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please provide a title for the test.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const testId = `${subject.toLowerCase()}-${level.toLowerCase()}-${Date.now()}`;
      
      let audioFilePath = null;
      
      // Upload audio file if provided
      if (audioFile) {
        setUploadingAudio(true);
        const fileExt = audioFile.name.split('.').pop();
        const fileName = `${testId}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('test-audio')
          .upload(fileName, audioFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        audioFilePath = fileName;
        setUploadingAudio(false);
      }
      
      const { error } = await supabase.from("tests").insert([{
        id: testId,
        category: subject,
        description: description || `${questionType} questions for ${subject} at ${level} level`,
        difficulty: level,
        duration: testDuration,
        questions: questions as any,
        title: testTitle,
        created_by: user.id,
        audio_file_path: audioFilePath,
      }]);

      if (error) throw error;

      toast({
        title: "Test Created!",
        description: audioFile ? "Test with audio file saved successfully." : "Questions have been saved as a new test.",
      });

      navigate("/admin");
    } catch (error: any) {
      console.error("Error saving test:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setUploadingAudio(false);
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex] = value;
    }
    setQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
    toast({
      title: "Question Deleted",
      description: "Question has been removed.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Question Generator</h1>
            <p className="text-muted-foreground">Generate custom questions for your tests</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Back to Admin
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Generate Questions
            </CardTitle>
            <CardDescription>
              Describe the questions you want to generate and let AI create them for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFL">EFL (English as Foreign Language)</SelectItem>
                    <SelectItem value="ESL">ESL (English as Second Language)</SelectItem>
                    <SelectItem value="IELTS">IELTS</SelectItem>
                    <SelectItem value="Checkpoint">Checkpoint</SelectItem>
                    <SelectItem value="Listening">Listening</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="Global Perspectives">Global Perspectives</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionType">Question Format</Label>
                <Select value={questionType} onValueChange={setQuestionType}>
                  <SelectTrigger id="questionType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed (Multiple Choice & Fill-in-Blank)</SelectItem>
                    <SelectItem value="multiple-choice">Multiple Choice Only</SelectItem>
                    <SelectItem value="fill-blank">Fill-in-Blank Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Question Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reading">Reading</SelectItem>
                    <SelectItem value="Listening">Listening</SelectItem>
                    <SelectItem value="Writing">Writing</SelectItem>
                    <SelectItem value="Speaking">Speaking</SelectItem>
                    <SelectItem value="Grammar">Grammar</SelectItem>
                    <SelectItem value="Vocabulary">Vocabulary</SelectItem>
                    <SelectItem value="Logic">Logic</SelectItem>
                    <SelectItem value="Problem Solving">Problem Solving</SelectItem>
                    <SelectItem value="Critical Thinking">Critical Thinking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionCount">Number of Questions</Label>
                <Input
                  id="questionCount"
                  type="number"
                  min="1"
                  max="20"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what kind of questions you want to generate. Be specific about topics, difficulty, or any special requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={1000}
              />
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Questions
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {questions.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Test Information</CardTitle>
                <CardDescription>Set the test title and duration before saving</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testTitle">Test Title</Label>
                  <Input
                    id="testTitle"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="Enter test title..."
                    maxLength={200}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testDuration">Duration (minutes)</Label>
                  <Input
                    id="testDuration"
                    type="number"
                    min="5"
                    max="180"
                    value={testDuration}
                    onChange={(e) => setTestDuration(parseInt(e.target.value) || 30)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audioFile">Audio File (Optional - for Listening tests)</Label>
                  <Input
                    id="audioFile"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  />
                  {audioFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {audioFile.name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generated Questions ({questions.length})</CardTitle>
                <CardDescription>Review and edit questions before saving</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((q, qIndex) => (
                  <Card key={q.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Label>Question {qIndex + 1}</Label>
                            <Select 
                              value={q.type} 
                              onValueChange={(value) => updateQuestion(qIndex, 'type', value)}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                <SelectItem value="fill-blank">Fill in the Blank</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Textarea
                            value={q.question}
                            onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                            rows={2}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteQuestion(qIndex)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {q.type === "multiple-choice" && q.options ? (
                        <div className="space-y-2">
                          <Label>Options</Label>
                          {q.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                className={q.correctAnswer === option ? "border-green-500" : ""}
                              />
                              <Button
                                variant={q.correctAnswer === option ? "default" : "outline"}
                                size="sm"
                                onClick={() => updateQuestion(qIndex, 'correctAnswer', option)}
                              >
                                {q.correctAnswer === option ? "Correct" : "Set Correct"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Correct Answer</Label>
                          <Input
                            value={String(q.correctAnswer)}
                            onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                            placeholder="Enter the correct answer..."
                            className="border-green-500"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Explanation</Label>
                        <Textarea
                          value={q.explanation}
                          onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  </Card>
                ))}

                <Button 
                  onClick={handleSaveAsTest} 
                  disabled={saving || uploadingAudio}
                  className="w-full"
                  size="lg"
                >
                  {saving || uploadingAudio ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {uploadingAudio ? "Uploading Audio..." : "Saving Test..."}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Save as Test
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default QuestionGenerator;
