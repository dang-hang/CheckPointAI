import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Save, X, Sparkles, ArrowLeft, FileEdit, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
const Admin = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Test>>({});
  const [questionsJson, setQuestionsJson] = useState("");
  const [usePartsFormat, setUsePartsFormat] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [testType, setTestType] = useState<"regular" | "writing">("regular");

  // Writing prompt specific fields
  const [writingPrompt, setWritingPrompt] = useState("");
  const [writingRubric, setWritingRubric] = useState("");
  useEffect(() => {
    checkAdminStatus();
    loadTests();
  }, []);
  const checkAdminStatus = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Unauthorized",
        description: "Please log in to access teacher panel",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }
    const {
      data: roles
    } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "teacher").maybeSingle();
    if (!roles) {
      toast({
        title: "Access Denied",
        description: "You don't have teacher permissions",
        variant: "destructive"
      });
      navigate("/dashboard");
      return;
    }
    setIsAdmin(true);
  };
  const loadTests = async () => {
    setLoading(true);
    
    // Load regular tests
    const { data: testsData, error: testsError } = await supabase
      .from("tests")
      .select("*")
      .order("created_at", { ascending: false });
    
    // Load writing prompts
    const { data: writingData, error: writingError } = await supabase
      .from("writing_prompts")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (testsError || writingError) {
      toast({
        title: "Error loading tests",
        description: testsError?.message || writingError?.message,
        variant: "destructive"
      });
      setLoading(false);
      return;
    }
    
    // Combine both types, marking writing prompts with a type
    const allTests = [
      ...(testsData || []).map(t => ({ ...t, testType: "regular" as const })),
      ...(writingData || []).map(w => ({
        id: w.id.toString(),
        title: w.title,
        description: w.prompt,
        category: "Writing",
        difficulty: w.difficulty,
        duration: w.time_limit,
        questions: [],
        parts: null,
        created_at: w.created_at,
        updated_at: w.updated_at,
        created_by: w.created_by,
        audio_file_path: null,
        testType: "writing" as const,
        writingPrompt: w.prompt,
        writingRubric: w.rubric
      }))
    ].sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime());
    
    setTests(allTests as unknown as Test[]);
    setLoading(false);
  };
  const startEdit = (test: Test & { testType?: "regular" | "writing"; writingPrompt?: string; writingRubric?: string }) => {
    setEditing(test.id);
    setFormData(test);
    
    if (test.testType === "writing") {
      setTestType("writing");
      setWritingPrompt(test.writingPrompt || "");
      setWritingRubric(test.writingRubric || "");
    } else {
      setTestType("regular");
      const hasParts = test.parts && test.parts.length > 0;
      setUsePartsFormat(hasParts);
      setQuestionsJson(JSON.stringify(hasParts ? test.parts : test.questions, null, 2));
    }
  };
  const cancelEdit = () => {
    setEditing(null);
    setFormData({});
    setQuestionsJson("");
    setUsePartsFormat(false);
    setAudioFile(null);
    setTestType("regular");
    setWritingPrompt("");
    setWritingRubric("");
  };
  const saveTest = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (testType === "writing") {
        // Save writing prompt
        if (!formData.title || !writingPrompt || !writingRubric) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields",
            variant: "destructive"
          });
          return;
        }
        const {
          error
        } = await supabase.from('writing_prompts').insert({
          title: formData.title,
          prompt: writingPrompt,
          rubric: writingRubric,
          difficulty: formData.difficulty || "intermediate",
          time_limit: formData.duration || 45,
          created_by: user.id
        });
        if (error) throw error;
        toast({
          title: "Writing prompt created successfully"
        });
      } else {
        // Save regular test
        const parsedData = JSON.parse(questionsJson);
        const testData: any = {
          ...formData
        };
        if (usePartsFormat) {
          testData.parts = parsedData;
          testData.questions = null;
        } else {
          testData.questions = parsedData;
          testData.parts = null;
        }
        let audioFilePath = null;

        // Upload audio file if provided
        if (audioFile && editing === "new") {
          setUploadingAudio(true);
          const fileExt = audioFile.name.split('.').pop();
          const fileName = `${formData.id}-${Date.now()}.${fileExt}`;
          const {
            error: uploadError
          } = await supabase.storage.from('test-audio').upload(fileName, audioFile, {
            cacheControl: '3600',
            upsert: false
          });
          if (uploadError) throw uploadError;
          audioFilePath = fileName;
          setUploadingAudio(false);
        }
        if (audioFilePath) {
          testData.audio_file_path = audioFilePath;
        }
        if (editing === "new") {
          const {
            error
          } = await supabase.from("tests").insert([testData as any]);
          if (error) throw error;
          toast({
            title: audioFile ? "Test with audio created successfully" : "Test created successfully"
          });
        } else {
          const {
            error
          } = await supabase.from("tests").update(testData as any).eq("id", editing);
          if (error) throw error;
          toast({
            title: "Test updated successfully"
          });
        }
      }
      loadTests();
      cancelEdit();
    } catch (error: any) {
      toast({
        title: "Error saving test",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingAudio(false);
    }
  };
  const deleteTest = async (id: string, isWriting?: boolean) => {
    if (!confirm("Are you sure you want to delete this test?")) return;
    
    const table = isWriting ? "writing_prompts" : "tests";
    const { error } = await supabase.from(table).delete().eq("id", id);
    
    if (error) {
      toast({
        title: "Error deleting test",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Test deleted successfully"
      });
      loadTests();
    }
  };
  if (!isAdmin) {
    return <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Checking permissions...</p>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Teacher Test Management</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/teacher/generate-questions")}>
              <Plus className="w-4 h-4 mr-2" />
              AI Generate
            </Button>
            <Button variant="outline" onClick={() => navigate("/writing-review")}>
              <FileEdit className="w-4 h-4 mr-2" />
              Review Writing
            </Button>
            <Button onClick={() => {
            setEditing("new");
            setTestType("regular");
            setFormData({
              id: "",
              category: "ESL",
              title: "",
              description: "",
              duration: 10,
              difficulty: "Beginner",
              questions: []
            });
            setQuestionsJson("[]");
            setWritingPrompt("");
            setWritingRubric("");
          }}>
              <Plus className="w-4 h-4 mr-2" />
              New Test
            </Button>
          </div>
        </div>

        {editing === "new" && <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Test</CardTitle>
              <CardDescription>Select test type and fill in the details below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Test Type</Label>
                <Select value={testType} onValueChange={(value: "regular" | "writing") => {
              setTestType(value);
              if (value === "writing") {
                setFormData({
                  ...formData,
                  category: "Writing",
                  duration: 45,
                  difficulty: "intermediate"
                });
              } else {
                setFormData({
                  ...formData,
                  category: "ESL",
                  duration: 10,
                  difficulty: "Beginner"
                });
              }
            }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular Test (IELTS, Checkpoint, ESL, Listening)</SelectItem>
                    <SelectItem value="writing">Writing Prompt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {testType === "regular" ? <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Test ID</Label>
                      <Input value={formData.id || ""} onChange={e => setFormData({
                  ...formData,
                  id: e.target.value
                })} placeholder="e.g., ielts-reading-1" maxLength={100} pattern="[a-z0-9-]+" title="Only lowercase letters, numbers, and hyphens allowed" required />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={formData.category} onValueChange={value => setFormData({
                  ...formData,
                  category: value
                })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IELTS">IELTS</SelectItem>
                          <SelectItem value="Checkpoint">Checkpoint</SelectItem>
                          <SelectItem value="ESL">ESL</SelectItem>
                          <SelectItem value="Listening">Listening</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Title</Label>
                    <Input value={formData.title || ""} onChange={e => setFormData({
                ...formData,
                title: e.target.value
              })} placeholder="Test title" maxLength={200} required />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea value={formData.description || ""} onChange={e => setFormData({
                ...formData,
                description: e.target.value
              })} placeholder="Test description" maxLength={1000} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Duration (minutes)</Label>
                      <Input type="number" value={formData.duration || ""} onChange={e => setFormData({
                  ...formData,
                  duration: parseInt(e.target.value)
                })} min={5} max={180} required />
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <Select value={formData.difficulty} onValueChange={value => setFormData({
                  ...formData,
                  difficulty: value
                })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audioFile">Audio File (Optional - for Listening tests)</Label>
                    <Input id="audioFile" type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)} />
                    {audioFile && <p className="text-sm text-muted-foreground">
                        Selected: {audioFile.name}
                      </p>}
                  </div>

                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <Label>Test Format</Label>
                      <div className="flex items-center gap-2">
                        
                        <Label htmlFor="use-parts" className="cursor-pointer text-sm">
                          Use Parts Format (for tests with grouped questions)
                        </Label>
                      </div>
                    </div>
                    <Label>{usePartsFormat ? "Parts (JSON format)" : "Questions (JSON format)"}</Label>
                    <Textarea value={questionsJson} onChange={e => setQuestionsJson(e.target.value)} placeholder={usePartsFormat ? '[{"id":"part-1","title":"Part 1","context":"...","questions":[...]}]' : '[{"id":"q1","type":"multiple-choice","question":"...","options":[],"correctAnswer":"","explanation":""}]'} className="font-mono text-sm min-h-[200px]" />
                    <Alert className="mt-2">
                      <AlertDescription>
                        {usePartsFormat ? <>
                            <strong>Parts Format:</strong> Use this for tests like Checkpoint exams where multiple questions share the same passage.
                            Each part has: id, title, context (optional passage), and questions array.
                          </> : <>
                            <strong>Simple Format:</strong> Array of questions. Each question has: id, type, question, options (for multiple-choice), correctAnswer, and explanation.
                          </>}
                      </AlertDescription>
                    </Alert>
                  </div>
                </> : <>
                  <div>
                    <Label>Title *</Label>
                    <Input value={formData.title || ""} onChange={e => setFormData({
                ...formData,
                title: e.target.value
              })} placeholder="e.g., Argumentative Essay on Technology" maxLength={200} required />
                  </div>

                  <div>
                    <Label>Writing Prompt *</Label>
                    <Textarea value={writingPrompt} onChange={e => setWritingPrompt(e.target.value)} placeholder="Enter the writing prompt or question that students will respond to..." className="min-h-[150px]" maxLength={2000} required />
                    <p className="text-sm text-muted-foreground mt-1">
                      This is what students will see as their writing assignment
                    </p>
                  </div>

                  <div>
                    <Label>Grading Rubric *</Label>
                    <Textarea value={writingRubric} onChange={e => setWritingRubric(e.target.value)} placeholder="Enter the grading criteria and rubric that AI will use to evaluate submissions...

Example:
- Content (30 points): Addresses the prompt, provides clear arguments with evidence
- Organization (25 points): Logical structure, clear introduction and conclusion
- Language Use (25 points): Vocabulary range, grammar accuracy
- Mechanics (20 points): Spelling, punctuation, formatting" className="min-h-[200px]" maxLength={3000} required />
                    <p className="text-sm text-muted-foreground mt-1">
                      The AI will use this rubric to provide detailed feedback and grading
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Difficulty Level</Label>
                      <Select value={formData.difficulty} onValueChange={value => setFormData({
                  ...formData,
                  difficulty: value
                })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Time Limit (minutes)</Label>
                      <Input type="number" value={formData.duration || ""} onChange={e => setFormData({
                  ...formData,
                  duration: parseInt(e.target.value)
                })} min={10} max={180} required />
                    </div>
                  </div>
                </>}

              <div className="flex gap-2">
                <Button onClick={saveTest} disabled={uploadingAudio}>
                  {uploadingAudio ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading Audio...
                    </> : <>
                      <Save className="w-4 h-4 mr-2" />
                      {testType === "writing" ? "Create Writing Prompt" : "Save Test"}
                    </>}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>}

        {loading ? <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tests...</p>
          </div> : <div className="grid gap-4">
            {tests.map(test => {
              const isWriting = (test as any).testType === "writing";
              return <div key={test.id} className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{test.title}</CardTitle>
                        <CardDescription>
                          {test.category} • {test.difficulty} • {test.duration} min • {isWriting ? "Writing Prompt" : test.parts ? `${test.parts.length} parts, ${test.parts.reduce((sum, p) => sum + p.questions.length, 0)} questions` : `${test.questions?.length || 0} questions`}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => startEdit(test as any)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => deleteTest(test.id, isWriting)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{test.description}</p>
                  </CardContent>
                </Card>

                {editing === test.id && <Card className="border-primary">
                    <CardHeader>
                      <CardTitle>Edit Test</CardTitle>
                      <CardDescription>Update the test details below</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Test ID</Label>
                          <Input value={formData.id || ""} onChange={e => setFormData({
                    ...formData,
                    id: e.target.value
                  })} placeholder="e.g., ielts-reading-1" maxLength={100} pattern="[a-z0-9-]+" title="Only lowercase letters, numbers, and hyphens allowed" required />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Select value={formData.category} onValueChange={value => setFormData({
                    ...formData,
                    category: value
                  })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IELTS">IELTS</SelectItem>
                              <SelectItem value="Checkpoint">Checkpoint</SelectItem>
                              <SelectItem value="ESL">ESL</SelectItem>
                              <SelectItem value="Listening">Listening</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>Title</Label>
                        <Input value={formData.title || ""} onChange={e => setFormData({
                  ...formData,
                  title: e.target.value
                })} placeholder="Test title" maxLength={200} required />
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea value={formData.description || ""} onChange={e => setFormData({
                  ...formData,
                  description: e.target.value
                })} placeholder="Test description" maxLength={1000} required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Duration (minutes)</Label>
                          <Input type="number" value={formData.duration || ""} onChange={e => setFormData({
                    ...formData,
                    duration: parseInt(e.target.value)
                  })} min={5} max={180} required />
                        </div>
                        <div>
                          <Label>Difficulty</Label>
                          <Select value={formData.difficulty} onValueChange={value => setFormData({
                    ...formData,
                    difficulty: value
                  })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Beginner">Beginner</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="audioFileEdit">Audio File (Optional - for Listening tests)</Label>
                        <Input id="audioFileEdit" type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)} />
                        {audioFile && <p className="text-sm text-muted-foreground">
                            Selected: {audioFile.name}
                          </p>}
                        {formData.audio_file_path && !audioFile && <p className="text-sm text-muted-foreground">
                            Current file: {formData.audio_file_path}
                          </p>}
                      </div>

                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <Label>Test Format</Label>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="use-parts" checked={usePartsFormat} onChange={e => {
                      setUsePartsFormat(e.target.checked);
                      if (e.target.checked) {
                        setQuestionsJson('[{"id":"part-1","title":"Part 1","context":"Passage text here...","questions":[{"id":"q1","type":"multiple-choice","question":"...","options":[],"correctAnswer":"","explanation":""}]}]');
                      } else {
                        setQuestionsJson('[{"id":"q1","type":"multiple-choice","question":"...","options":[],"correctAnswer":"","explanation":""}]');
                      }
                    }} className="w-4 h-4" />
                            <Label htmlFor="use-parts" className="cursor-pointer text-sm">
                              Use Parts Format (for tests with grouped questions)
                            </Label>
                          </div>
                        </div>
                        <Label>{usePartsFormat ? "Parts (JSON format)" : "Questions (JSON format)"}</Label>
                        <Textarea value={questionsJson} onChange={e => setQuestionsJson(e.target.value)} placeholder={usePartsFormat ? '[{"id":"part-1","title":"Part 1","context":"...","questions":[...]}]' : '[{"id":"q1","type":"multiple-choice","question":"...","options":[],"correctAnswer":"","explanation":""}]'} className="font-mono text-sm min-h-[200px]" />
                        <Alert className="mt-2">
                          <AlertDescription>
                            {usePartsFormat ? <>
                                <strong>Parts Format:</strong> Use this for tests like Checkpoint exams where multiple questions share the same passage.
                                Each part has: id, title, context (optional passage), and questions array.
                              </> : <>
                                <strong>Simple Format:</strong> Array of questions. Each question has: id, type, question, options (for multiple-choice), correctAnswer, and explanation.
                              </>}
                          </AlertDescription>
                        </Alert>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={saveTest} disabled={uploadingAudio}>
                          {uploadingAudio ? <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading Audio...
                            </> : <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Test
                            </>}
                        </Button>
                        <Button variant="outline" onClick={cancelEdit}>
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>}
              </div>;
            })}
          </div>}
      </div>
    </div>;
};
export default Admin;