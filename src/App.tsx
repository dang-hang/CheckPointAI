import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ExamMastery from "./pages/ExamMastery";
import PracticeHub from "./pages/PracticeHub";
import StudyInsights from "./pages/StudyInsights";
import Community from "./pages/Community";
import Practice from "./pages/Practice";
import TestTaking from "./pages/TestTaking";
import PastResults from "./pages/PastResults";
import Admin from "./pages/Admin";
import QuestionGenerator from "./pages/QuestionGenerator";
import TeacherDashboard from "./pages/TeacherDashboard";
import NotFound from "./pages/NotFound";
import WritingPrompts from "./pages/WritingPrompts";
import WritingTest from "./pages/WritingTest";
import WritingReview from "./pages/WritingReview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/exam-mastery" element={<ProtectedRoute><ExamMastery /></ProtectedRoute>} />
          <Route path="/practice-hub" element={<ProtectedRoute><PracticeHub /></ProtectedRoute>} />
          <Route path="/study-insights" element={<ProtectedRoute><StudyInsights /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
          <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
          <Route path="/practice/:testId" element={<ProtectedRoute><TestTaking /></ProtectedRoute>} />
          <Route path="/past-results" element={<ProtectedRoute><PastResults /></ProtectedRoute>} />
          <Route path="/teacher" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/teacher/generate-questions" element={<ProtectedRoute><QuestionGenerator /></ProtectedRoute>} />
          <Route path="/teacher/dashboard" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/writing-prompts" element={<ProtectedRoute><WritingPrompts /></ProtectedRoute>} />
          <Route path="/writing-test/:promptId" element={<ProtectedRoute><WritingTest /></ProtectedRoute>} />
          <Route path="/writing-review" element={<ProtectedRoute><WritingReview /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
