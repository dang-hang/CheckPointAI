import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  BookOpen, FileText, Upload, Plus, Edit, Trash2, Download, 
  GraduationCap, Headphones, PenTool, FolderOpen 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExamPart {
  id: string;
  name: string;
  description: string | null;
  exam_type: string;
  display_order: number;
  created_at: string;
}

interface ExamDocument {
  id: string;
  title: string;
  description: string | null;
  part_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

const ExamMastery = () => {
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedExamType, setSelectedExamType] = useState<string>("Checkpoint");
  const [parts, setParts] = useState<ExamPart[]>([]);
  const [documents, setDocuments] = useState<ExamDocument[]>([]);
  
  // Part dialog state
  const [partDialogOpen, setPartDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<ExamPart | null>(null);
  const [partName, setPartName] = useState("");
  const [partDescription, setPartDescription] = useState("");
  const [partOrder, setPartOrder] = useState(0);
  
  // Document upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const examTypes = [
    { value: "Checkpoint", label: "Cambridge Checkpoint", icon: BookOpen, color: "from-blue-500 to-blue-600" },
    { value: "IGCSE", label: "IGCSE", icon: GraduationCap, color: "from-purple-500 to-purple-600" },
    { value: "IELTS", label: "IELTS", icon: Headphones, color: "from-green-500 to-green-600" },
    { value: "General English", label: "General English", icon: PenTool, color: "from-orange-500 to-orange-600" },
  ];

  useEffect(() => {
    checkAdminStatus();
    loadParts();
    loadDocuments();
  }, [selectedExamType]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!roles);
    setLoading(false);
  };

  const loadParts = async () => {
    const { data, error } = await supabase
      .from("exam_parts")
      .select("*")
      .eq("exam_type", selectedExamType)
      .order("display_order", { ascending: true });

    if (error) {
      toast({
        title: "Error loading parts",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setParts(data || []);
  };

  const loadDocuments = async () => {
    const { data: partsData } = await supabase
      .from("exam_parts")
      .select("id")
      .eq("exam_type", selectedExamType);

    if (!partsData || partsData.length === 0) {
      setDocuments([]);
      return;
    }

    const partIds = partsData.map(p => p.id);
    const { data, error } = await supabase
      .from("exam_documents")
      .select("*")
      .in("part_id", partIds)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading documents",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setDocuments(data || []);
  };

  const handleSavePart = async () => {
    if (!partName.trim()) {
      toast({
        title: "Validation Error",
        description: "Part name is required",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingPart) {
      const { error } = await supabase
        .from("exam_parts")
        .update({
          name: partName,
          description: partDescription,
          display_order: partOrder,
        })
        .eq("id", editingPart.id);

      if (error) {
        toast({
          title: "Error updating part",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Part updated successfully",
      });
    } else {
      const { error } = await supabase
        .from("exam_parts")
        .insert({
          name: partName,
          description: partDescription,
          exam_type: selectedExamType,
          display_order: partOrder,
          created_by: user.id,
        });

      if (error) {
        toast({
          title: "Error creating part",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Part created successfully",
      });
    }

    setPartDialogOpen(false);
    resetPartForm();
    loadParts();
  };

  const handleDeletePart = async (partId: string) => {
    if (!confirm("Are you sure? This will delete all documents in this part.")) {
      return;
    }

    const { error } = await supabase
      .from("exam_parts")
      .delete()
      .eq("id", partId);

    if (error) {
      toast({
        title: "Error deleting part",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Part deleted successfully",
    });
    loadParts();
    loadDocuments();
  };

  const handleUploadDocument = async () => {
    if (!docTitle.trim() || !uploadFile || !selectedPartId) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields and select a file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Upload file to storage
      const fileExt = uploadFile.name.split('.').pop();
      const filePath = `${selectedExamType}/${selectedPartId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('exam-documents')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Save document metadata to database
      const { error: dbError } = await supabase
        .from("exam_documents")
        .insert({
          title: docTitle,
          description: docDescription,
          part_id: selectedPartId,
          file_path: filePath,
          file_name: uploadFile.name,
          file_size: uploadFile.size,
          file_type: uploadFile.type,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });

      setUploadDialogOpen(false);
      resetUploadForm();
      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (doc: ExamDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('exam-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Document downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Download Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (doc: ExamDocument) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('exam-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("exam_documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Delete Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetPartForm = () => {
    setEditingPart(null);
    setPartName("");
    setPartDescription("");
    setPartOrder(0);
  };

  const resetUploadForm = () => {
    setSelectedPartId("");
    setDocTitle("");
    setDocDescription("");
    setUploadFile(null);
  };

  const openEditPart = (part: ExamPart) => {
    setEditingPart(part);
    setPartName(part.name);
    setPartDescription(part.description || "");
    setPartOrder(part.display_order);
    setPartDialogOpen(true);
  };

  const currentExamType = examTypes.find(t => t.value === selectedExamType);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Exam{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Resources
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Access study materials and documents for your exam preparation
          </p>
        </div>

        {/* Exam Type Selector */}
        <div className="flex gap-3 mb-8 justify-center flex-wrap">
          {examTypes.map((exam) => (
            <Button
              key={exam.value}
              variant={selectedExamType === exam.value ? "default" : "outline"}
              onClick={() => setSelectedExamType(exam.value)}
              className="gap-2"
            >
              <exam.icon className="w-4 h-4" />
              {exam.label}
            </Button>
          ))}
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="mb-6 flex gap-3 justify-center">
            <Dialog open={partDialogOpen} onOpenChange={setPartDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetPartForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Part/Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPart ? "Edit Part" : "Create New Part"}
                  </DialogTitle>
                  <DialogDescription>
                    Add a new section to organize documents for {selectedExamType}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="partName">Part Name *</Label>
                    <Input
                      id="partName"
                      value={partName}
                      onChange={(e) => setPartName(e.target.value)}
                      placeholder="e.g., Reading Section, Grammar Basics"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <Label htmlFor="partDesc">Description</Label>
                    <Textarea
                      id="partDesc"
                      value={partDescription}
                      onChange={(e) => setPartDescription(e.target.value)}
                      placeholder="Optional description"
                      maxLength={500}
                    />
                  </div>
                  <div>
                    <Label htmlFor="partOrder">Display Order</Label>
                    <Input
                      id="partOrder"
                      type="number"
                      value={partOrder}
                      onChange={(e) => setPartOrder(parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                  <Button onClick={handleSavePart} className="w-full">
                    {editingPart ? "Update Part" : "Create Part"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {parts.length > 0 && (
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={resetUploadForm}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                      Upload a study material or document for {selectedExamType}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="partSelect">Select Part *</Label>
                      <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                        <SelectTrigger id="partSelect">
                          <SelectValue placeholder="Choose a part" />
                        </SelectTrigger>
                        <SelectContent>
                          {parts.map((part) => (
                            <SelectItem key={part.id} value={part.id}>
                              {part.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="docTitle">Document Title *</Label>
                      <Input
                        id="docTitle"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="e.g., Chapter 1 Notes"
                        maxLength={200}
                      />
                    </div>
                    <div>
                      <Label htmlFor="docDesc">Description</Label>
                      <Textarea
                        id="docDesc"
                        value={docDescription}
                        onChange={(e) => setDocDescription(e.target.value)}
                        placeholder="Optional description"
                        maxLength={500}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fileUpload">File *</Label>
                      <Input
                        id="fileUpload"
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported: PDF, Word, PowerPoint, Text (Max 20MB)
                      </p>
                    </div>
                    <Button 
                      onClick={handleUploadDocument} 
                      className="w-full"
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Upload Document"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}

        {/* Parts and Documents Display */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : parts.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                {isAdmin 
                  ? "No parts created yet. Click 'Add Part/Section' to get started."
                  : "No materials available yet for this exam type."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {parts.map((part) => {
              const partDocs = documents.filter(d => d.part_id === part.id);
              
              return (
                <Card key={part.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <FolderOpen className="w-5 h-5 text-primary" />
                          {part.name}
                        </CardTitle>
                        {part.description && (
                          <CardDescription className="mt-1">
                            {part.description}
                          </CardDescription>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditPart(part)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeletePart(part.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {partDocs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No documents in this part yet
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {partDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{doc.title}</p>
                                {doc.description && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {doc.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {doc.file_name}
                                  </Badge>
                                  {doc.file_size && (
                                    <span className="text-xs text-muted-foreground">
                                      {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadDocument(doc)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteDocument(doc)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

export default ExamMastery;