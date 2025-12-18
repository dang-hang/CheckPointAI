import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

const WritingReview = () => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [teacherGrade, setTeacherGrade] = useState("");
  const [teacherNotes, setTeacherNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('writing_submissions')
        .select('*, writing_prompts(*)')
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Fetch profile data for each submission
      const enrichedSubmissions = await Promise.all(
        (submissionsData || []).map(async (submission) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', submission.student_id)
            .single();

          return {
            ...submission,
            profiles: profile || { full_name: null, email: 'Unknown' }
          };
        })
      );

      setSubmissions(enrichedSubmissions);
    } catch (error: any) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReview = async () => {
    if (!selectedSubmission) return;

    const grade = parseFloat(teacherGrade);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast({
        title: "Invalid Grade",
        description: "Please enter a grade between 0 and 100",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('writing_submissions')
        .update({
          teacher_grade: grade,
          teacher_notes: teacherNotes,
          status: 'teacher_reviewed'
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast({
        title: "Review Saved",
        description: "Your review has been saved successfully",
      });

      // Reload submissions
      await loadSubmissions();
      setSelectedSubmission(null);
      setTeacherGrade("");
      setTeacherNotes("");
    } catch (error: any) {
      console.error('Error saving review:', error);
      toast({
        title: "Error",
        description: "Failed to save review",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'ai_graded':
        return <Badge className="bg-blue-500">AI Graded</Badge>;
      case 'teacher_reviewed':
        return <Badge className="bg-green-500">Reviewed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center animate-fade-in">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Review Student Writing
          </h2>
          <p className="text-muted-foreground text-lg">
            Review AI grading and provide final feedback
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Submissions List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="font-semibold mb-4">Submissions</h3>
            {submissions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No submissions yet</p>
                </CardContent>
              </Card>
            ) : (
              submissions.map((submission) => (
                <Card
                  key={submission.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedSubmission?.id === submission.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedSubmission(submission);
                    setTeacherGrade(submission.teacher_grade?.toString() || "");
                    setTeacherNotes(submission.teacher_notes || "");
                  }}
                >
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-sm">
                        {submission.profiles?.full_name || submission.profiles?.email}
                      </CardTitle>
                      {getStatusBadge(submission.status)}
                    </div>
                    <CardDescription className="text-xs line-clamp-1">
                      {submission.writing_prompts?.title}
                    </CardDescription>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{submission.word_count} words</span>
                      {submission.ai_grade && (
                        <span className="text-primary">AI: {submission.ai_grade}/100</span>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-2">
            {!selectedSubmission ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Select a Submission</h3>
                  <p className="text-muted-foreground">
                    Choose a submission from the list to review
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedSubmission.writing_prompts?.title}</CardTitle>
                    <CardDescription>
                      Student: {selectedSubmission.profiles?.full_name || selectedSubmission.profiles?.email}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Prompt:</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedSubmission.writing_prompts?.prompt}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Student's Response ({selectedSubmission.word_count} words):</h4>
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{selectedSubmission.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedSubmission.ai_feedback && (
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Feedback</CardTitle>
                      <CardDescription>
                        AI Grade: <span className="text-primary font-semibold">{selectedSubmission.ai_grade}/100</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{selectedSubmission.ai_feedback}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Your Review</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="teacher-grade">Final Grade (0-100)</Label>
                      <Input
                        id="teacher-grade"
                        type="number"
                        min="0"
                        max="100"
                        value={teacherGrade}
                        onChange={(e) => setTeacherGrade(e.target.value)}
                        placeholder="Enter grade"
                      />
                    </div>

                    <div>
                      <Label htmlFor="teacher-notes">Your Feedback</Label>
                      <Textarea
                        id="teacher-notes"
                        value={teacherNotes}
                        onChange={(e) => setTeacherNotes(e.target.value)}
                        placeholder="Provide additional feedback for the student..."
                        className="min-h-[150px]"
                      />
                    </div>

                    <Button
                      onClick={handleSaveReview}
                      disabled={saving || !teacherGrade}
                      className="w-full"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Review"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default WritingReview;