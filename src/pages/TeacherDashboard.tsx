import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import Navigation from "@/components/Navigation";

interface Student {
  id: string;
  email: string;
}

interface Class {
  id: string;
  name: string;
  description: string | null;
  students: Student[];
}

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reportContent, setReportContent] = useState<string>("");
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkTeacherAccess();
    fetchClasses();
  }, []);

  const checkTeacherAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error checking roles:', error);
      return;
    }

    const hasAccess = roles?.some(r => r.role === 'teacher');
    
    if (!hasAccess) {
      toast({
        title: "Access Denied",
        description: "You need teacher access to view this page",
        variant: "destructive",
      });
      navigate('/');
    }
  };

  const fetchClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch classes using raw query  
      // Note: Once types regenerate, this can be simplified
      const { data: tcData, error: tcError } = await supabase
        .from('teacher_class' as any)
        .select('class_id')
        .eq('teacher_id', user.id);

      if (tcError) throw tcError;

      const classIds = tcData?.map((tc: any) => tc.class_id) || [];
      
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

          // Get student emails from auth
          const students = await Promise.all(
            (studentData || []).map(async (sc: any) => {
              try {
                const { data: { user: studentUser } } = await supabase.auth.admin.getUserById(sc.student_id);
                return {
                  id: sc.student_id,
                  email: studentUser?.email || 'Unknown'
                };
              } catch {
                return {
                  id: sc.student_id,
                  email: 'Unknown'
                };
              }
            })
          );

          return {
            ...classItem,
            students
          };
        })
      );

      setClasses(classesWithStudents);
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

  const generateReport = async () => {
    if (!selectedStudent || !startDate || !endDate) {
      toast({
        title: "Missing Information",
        description: "Please select a student and date range",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-progress-report', {
        body: {
          studentId: selectedStudent.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          classId: selectedClassId
        }
      });

      if (error) throw error;

      setReportContent(data.reportContent);
      setShowReport(true);
      toast({
        title: "Report Generated",
        description: "Student progress report has been created successfully",
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Manage your classes and generate student progress reports</p>
        </div>

        {classes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">You are not assigned to any classes yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Contact an administrator to be assigned to classes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {classes.map((classItem) => (
              <Card key={classItem.id}>
                <CardHeader>
                  <CardTitle>{classItem.name}</CardTitle>
                  {classItem.description && (
                    <CardDescription>{classItem.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold mb-4">Students ({classItem.students.length})</h3>
                  {classItem.students.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No students enrolled yet.</p>
                  ) : (
                    <div className="grid gap-3">
                      {classItem.students.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{student.email}</p>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedStudent(student);
                              setSelectedClassId(classItem.id);
                            }}
                            size="sm"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Report
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Report Generation Dialog */}
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate Progress Report</DialogTitle>
              <DialogDescription>
                Select date range for {selectedStudent?.email}'s progress report
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button
                onClick={generateReport}
                disabled={generating || !startDate || !endDate}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Report Display Dialog */}
        <Dialog open={showReport} onOpenChange={setShowReport}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Progress Report</DialogTitle>
              <DialogDescription>
                {selectedStudent?.email} - {startDate && format(startDate, "PPP")} to {endDate && format(endDate, "PPP")}
              </DialogDescription>
            </DialogHeader>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{reportContent}</ReactMarkdown>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}