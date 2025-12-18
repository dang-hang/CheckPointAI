import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, UserPlus, Users, FileText, Calendar, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';

interface Student {
  id: string;
  email: string;
  full_name: string;
}

interface Class {
  id: string;
  name: string;
  description: string | null;
  students: Student[];
}

export default function Community() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);
  const [showNewClassDialog, setShowNewClassDialog] = useState(false);
  const [showAddStudentDialog, setShowAddStudentDialog] = useState<string | null>(null);
  const [showReportDialog, setShowReportDialog] = useState<{ classId: string; studentId: string; studentName: string } | null>(null);
  const [showViewReportsDialog, setShowViewReportsDialog] = useState<{ studentId: string; studentName: string } | null>(null);
  
  // New class form
  const [newClassName, setNewClassName] = useState("");
  const [newClassDescription, setNewClassDescription] = useState("");
  const [creating, setCreating] = useState(false);
  
  // Add student form
  const [studentEmail, setStudentEmail] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  
  // View saved reports
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUserRole();
    fetchClasses();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'teacher')
      .maybeSingle();

    setIsTeacher(!!roles);
  };

  const fetchClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is a teacher
      const { data: teacherRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'teacher')
        .maybeSingle();

      if (teacherRoles) {
        // Fetch teacher's classes
        const { data: teacherClasses, error: classError } = await supabase
          .from('teacher_class' as any)
          .select('class_id')
          .eq('teacher_id', user.id);

        if (classError) throw classError;

        const classIds = teacherClasses?.map((tc: any) => tc.class_id) || [];
        
        if (classIds.length === 0) {
          setClasses([]);
          setLoading(false);
          return;
        }

        const { data: classData, error: classesError } = await supabase
          .from('classes' as any)
          .select('*')
          .in('id', classIds);

        if (classesError) throw classesError;

        // Fetch students for each class
        const classesWithStudents = await Promise.all(
          (classData || []).map(async (classItem: any) => {
            const { data: studentData, error: studentsError } = await supabase
              .from('student_class' as any)
              .select('student_id')
              .eq('class_id', classItem.id);

            if (studentsError) {
              console.error('Error fetching students:', studentsError);
              return {
                ...classItem,
                students: []
              };
            }

            // Get student profiles
            const students = await Promise.all(
              (studentData || []).map(async (sc: any) => {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('email, full_name')
                  .eq('id', sc.student_id)
                  .single();
                
                return {
                  id: sc.student_id,
                  email: profile?.email || 'Unknown',
                  full_name: profile?.full_name || 'Unknown'
                };
              })
            );

            return {
              ...classItem,
              students
            };
          })
        );

        setClasses(classesWithStudents);
      } else {
        // Fetch student's classes
        const { data: studentClasses, error: classError } = await supabase
          .from('student_class' as any)
          .select('class_id')
          .eq('student_id', user.id);

        if (classError) throw classError;

        const classIds = studentClasses?.map((sc: any) => sc.class_id) || [];
        
        if (classIds.length === 0) {
          setClasses([]);
          setLoading(false);
          return;
        }

        const { data: classData, error: classesError } = await supabase
          .from('classes' as any)
          .select('*')
          .in('id', classIds);

        if (classesError) throw classesError;

        setClasses((classData || []).map((c: any) => ({ ...c, students: [] })));
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      toast({
        title: "Error",
        description: "Failed to load classes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createClass = async () => {
    if (!newClassName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a class name",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create the class
      const { data: newClass, error: classError } = await supabase
        .from('classes' as any)
        .insert({
          name: newClassName,
          description: newClassDescription || null
        })
        .select()
        .single();

      if (classError || !newClass) throw classError || new Error('Failed to create class');

      // Assign teacher to the class
      const { error: assignError } = await supabase
        .from('teacher_class' as any)
        .insert({
          teacher_id: user.id,
          class_id: (newClass as any).id
        });

      if (assignError) throw assignError;

      toast({
        title: "Success",
        description: "Class created successfully",
      });

      setNewClassName("");
      setNewClassDescription("");
      setShowNewClassDialog(false);
      fetchClasses();
    } catch (error: any) {
      console.error('Error creating class:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create class",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const addStudentToClass = async (classId: string) => {
    if (!studentEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a student email",
        variant: "destructive",
      });
      return;
    }

    setAddingStudent(true);
    try {
      // Call edge function to add student
      const { data, error } = await supabase.functions.invoke('add-student-to-class', {
        body: {
          email: studentEmail.trim(),
          classId: classId
        }
      });

      // Check both error object and data.error for the message
      const errorMessage = error?.message || data?.error || '';
      
      if (error || data?.error) {
        // Check if student hasn't registered yet
        if (errorMessage.includes('No user found') || errorMessage.includes('signed up')) {
          toast({
            title: "Student Not Registered",
            description: "This student hasn't signed up yet. Please ask them to create an account first, then you can add them to the class.",
          });
        } else if (errorMessage.includes('already enrolled')) {
          toast({
            title: "Already Enrolled",
            description: "This student is already in the class.",
          });
        } else {
          toast({
            title: "Unable to Add Student",
            description: errorMessage || "Failed to add student",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Success",
        description: "Student added to class",
      });

      setStudentEmail("");
      setShowAddStudentDialog(null);
      fetchClasses();
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add student",
        variant: "destructive",
      });
    } finally {
      setAddingStudent(false);
    }
  };

  const removeStudentFromClass = async (classId: string, studentId: string) => {
    try {
      const { error } = await supabase
        .from('student_class' as any)
        .delete()
        .eq('student_id', studentId)
        .eq('class_id', classId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Student removed from class",
      });

      fetchClasses();
    } catch (error: any) {
      console.error('Error removing student:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove student",
        variant: "destructive",
      });
    }
  };

  const deleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class? This will remove all student enrollments.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('classes' as any)
        .delete()
        .eq('id', classId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Class deleted successfully",
      });

      fetchClasses();
    } catch (error: any) {
      console.error('Error deleting class:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete class",
        variant: "destructive",
      });
    }
  };

  const generateProgressReport = async () => {
    if (!reportStartDate || !reportEndDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (!showReportDialog) return;

    setGeneratingReport(true);
    setGeneratedReport(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-progress-report', {
        body: {
          studentId: showReportDialog.studentId,
          classId: showReportDialog.classId,
          startDate: reportStartDate,
          endDate: reportEndDate
        }
      });

      if (error) {
        // Check if it's the "no test results" case
        const errorMessage = error.message || JSON.stringify(error);
        if (errorMessage.includes("No test results found")) {
          toast({
            title: "No Test Results",
            description: "This student hasn't taken any tests during the selected period. Please try a different date range.",
          });
          return;
        }
        throw error;
      }

      if (data?.error) {
        // Handle the "no test results" case from data
        if (data.error.includes("No test results found")) {
          toast({
            title: "No Test Results",
            description: "This student hasn't taken any tests during the selected period. Please try a different date range.",
          });
          return;
        }
        
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setGeneratedReport(data.reportContent);
      toast({
        title: "Success",
        description: "Progress report generated and saved successfully",
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      
      // Check if it's the "no test results" error
      const errorMessage = error.message || error.context?.body || JSON.stringify(error);
      if (errorMessage.includes("No test results found")) {
        toast({
          title: "No Test Results",
          description: "This student hasn't taken any tests during the selected period. Please try a different date range.",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const fetchSavedReports = async (studentId: string) => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('progress_reports')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedReports(data || []);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Error",
        description: "Failed to load saved reports",
        variant: "destructive",
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const downloadReport = (reportContent: string, studentName: string, dateInfo: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Add title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Progress Report: ${studentName}`, margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Period: ${dateInfo.replace('_to_', ' to ')}`, margin, yPosition);
    yPosition += 10;

    // Process markdown content
    const lines = reportContent.split('\n');
    doc.setFontSize(11);

    lines.forEach((line) => {
      // Check if we need a new page
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      // Handle headers
      if (line.startsWith('### ')) {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        const text = line.replace('### ', '');
        const splitText = doc.splitTextToSize(text, maxWidth);
        doc.text(splitText, margin, yPosition);
        yPosition += splitText.length * 6 + 3;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
      } else if (line.startsWith('## ')) {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(13);
        const text = line.replace('## ', '');
        const splitText = doc.splitTextToSize(text, maxWidth);
        doc.text(splitText, margin, yPosition);
        yPosition += splitText.length * 7 + 4;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
      } else if (line.startsWith('# ')) {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(14);
        const text = line.replace('# ', '');
        const splitText = doc.splitTextToSize(text, maxWidth);
        doc.text(splitText, margin, yPosition);
        yPosition += splitText.length * 8 + 5;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
      } else if (line.startsWith('**') && line.endsWith('**')) {
        // Bold text
        doc.setFont(undefined, 'bold');
        const text = line.replace(/\*\*/g, '');
        const splitText = doc.splitTextToSize(text, maxWidth);
        doc.text(splitText, margin, yPosition);
        yPosition += splitText.length * 5 + 2;
        doc.setFont(undefined, 'normal');
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        // Bullet points
        const text = '• ' + line.substring(2);
        const splitText = doc.splitTextToSize(text, maxWidth - 5);
        doc.text(splitText, margin + 5, yPosition);
        yPosition += splitText.length * 5 + 1;
      } else if (line.trim() === '') {
        // Empty line
        yPosition += 3;
      } else {
        // Regular text
        const cleanText = line.replace(/\*\*/g, '');
        const splitText = doc.splitTextToSize(cleanText, maxWidth);
        doc.text(splitText, margin, yPosition);
        yPosition += splitText.length * 5 + 2;
      }
    });

    // Save the PDF
    doc.save(`Progress_Report_${studentName.replace(/\s+/g, '_')}_${dateInfo}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              {isTeacher ? "My Classes" : "My Enrolled Classes"}
            </h1>
            <p className="text-muted-foreground">
              {isTeacher 
                ? "Manage your classes and students" 
                : "View the classes you're enrolled in"}
            </p>
          </div>
          {isTeacher && (
            <Dialog open={showNewClassDialog} onOpenChange={setShowNewClassDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                  <DialogDescription>
                    Add a new class to your teaching schedule
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="className">Class Name</Label>
                    <Input
                      id="className"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="e.g., English 101"
                    />
                  </div>
                  <div>
                    <Label htmlFor="classDescription">Description (Optional)</Label>
                    <Textarea
                      id="classDescription"
                      value={newClassDescription}
                      onChange={(e) => setNewClassDescription(e.target.value)}
                      placeholder="Brief description of the class"
                      rows={3}
                    />
                  </div>
                  <Button 
                    onClick={createClass} 
                    disabled={creating}
                    className="w-full"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Class"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {classes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {isTeacher 
                  ? "You haven't created any classes yet. Click 'New Class' to get started!" 
                  : "You're not enrolled in any classes yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {classes.map((classItem) => (
              <Card key={classItem.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{classItem.name}</CardTitle>
                      {classItem.description && (
                        <CardDescription className="mt-2">
                          {classItem.description}
                        </CardDescription>
                      )}
                    </div>
                    {isTeacher && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteClass(classItem.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isTeacher ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">
                          Students ({classItem.students.length})
                        </h3>
                        <Dialog 
                          open={showAddStudentDialog === classItem.id}
                          onOpenChange={(open) => setShowAddStudentDialog(open ? classItem.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add Student
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Student to {classItem.name}</DialogTitle>
                              <DialogDescription>
                                Enter the student's email address to add them to this class
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Alert>
                                <AlertDescription>
                                  The student must have an account before they can be added.
                                </AlertDescription>
                              </Alert>
                              <div>
                                <Label htmlFor="studentEmail">Student Email</Label>
                                <Input
                                  id="studentEmail"
                                  type="email"
                                  value={studentEmail}
                                  onChange={(e) => setStudentEmail(e.target.value)}
                                  placeholder="student@example.com"
                                />
                              </div>
                              <Button
                                onClick={() => addStudentToClass(classItem.id)}
                                disabled={addingStudent}
                                className="w-full"
                              >
                                {addingStudent ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Adding...
                                  </>
                                ) : (
                                  "Add Student"
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      {classItem.students.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No students enrolled yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {classItem.students.map((student) => (
                            <div
                              key={student.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{student.full_name}</span>
                                <span className="text-xs text-muted-foreground">{student.email}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowViewReportsDialog({
                                      studentId: student.id,
                                      studentName: student.full_name
                                    });
                                    fetchSavedReports(student.id);
                                  }}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  View Reports
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowReportDialog({
                                    classId: classItem.id,
                                    studentId: student.id,
                                    studentName: student.full_name
                                  })}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  New Report
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeStudentFromClass(classItem.id, student.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>You are enrolled in this class</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Generate Report Dialog */}
        <Dialog 
          open={!!showReportDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowReportDialog(null);
              setReportStartDate("");
              setReportEndDate("");
              setGeneratedReport(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Progress Report</DialogTitle>
              <DialogDescription>
                Generate a comprehensive progress report for {showReportDialog?.studentName}
              </DialogDescription>
            </DialogHeader>
            
            {!generatedReport ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    The report will analyze all test results for this student within the selected date range and be saved automatically.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={generateProgressReport}
                  disabled={generatingReport}
                  className="w-full"
                >
                  {generatingReport ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="prose prose-sm max-w-none dark:prose-invert space-y-4 [&>h2]:mt-6 [&>h2]:mb-3 [&>h2]:text-lg [&>h2]:font-bold [&>ul]:space-y-2 [&>p]:mb-3">
                  <ReactMarkdown>{generatedReport}</ReactMarkdown>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => downloadReport(
                      generatedReport, 
                      showReportDialog?.studentName || 'Student',
                      `${reportStartDate}_to_${reportEndDate}`
                    )}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setGeneratedReport(null)}
                    className="flex-1"
                  >
                    Generate Another Report
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View Saved Reports Dialog */}
        <Dialog 
          open={!!showViewReportsDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowViewReportsDialog(null);
              setSavedReports([]);
              setSelectedReport(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Progress Reports for {showViewReportsDialog?.studentName}</DialogTitle>
              <DialogDescription>
                View all previously generated progress reports
              </DialogDescription>
            </DialogHeader>
            
            {loadingReports ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : selectedReport ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Generated on {new Date(selectedReport.created_at).toLocaleDateString()} 
                    <span className="mx-2">•</span>
                    Period: {new Date(selectedReport.start_date).toLocaleDateString()} - {new Date(selectedReport.end_date).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadReport(
                        selectedReport.report_content,
                        showViewReportsDialog?.studentName || 'Student',
                        `${new Date(selectedReport.start_date).toISOString().split('T')[0]}_to_${new Date(selectedReport.end_date).toISOString().split('T')[0]}`
                      )}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedReport(null)}
                    >
                      Back to List
                    </Button>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert space-y-4 [&>h2]:mt-6 [&>h2]:mb-3 [&>h2]:text-lg [&>h2]:font-bold [&>ul]:space-y-2 [&>p]:mb-3">
                  <ReactMarkdown>{selectedReport.report_content}</ReactMarkdown>
                </div>
              </div>
            ) : savedReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reports found for this student
              </div>
            ) : (
              <div className="space-y-2">
                {savedReports.map((report) => (
                  <Card key={report.id} className="cursor-pointer hover:bg-accent" onClick={() => setSelectedReport(report)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            Report from {new Date(report.start_date).toLocaleDateString()} to {new Date(report.end_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Generated {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}