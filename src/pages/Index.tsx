import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  GraduationCap,
  Target,
  Lightbulb,
  Users,
  ArrowRight,
  CheckCircle,
  Mail,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";

const Index = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Exam Mastery",
      description: "Resources for Checkpoint, IGCSE, IELTS, and general English",
      icon: GraduationCap,
      color: "from-blue-500 to-blue-600",
      path: "/exam-mastery",
    },
    {
      title: "Practice Hub",
      description: "Interactive quizzes, mock exams, and progress tracking",
      icon: Target,
      color: "from-green-500 to-green-600",
      path: "/practice-hub",
    },
    {
      title: "Study Insights",
      description: "Tips, strategies, and expert advice for effective preparation",
      icon: Lightbulb,
      color: "from-orange-500 to-orange-600",
      path: "/study-insights",
    },
    {
      title: "Community & Support",
      description: "Discussion forums, study groups, and personalized assistance",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      path: "/community",
    },
  ];

  const features = [
    "AI-powered personalized feedback on every answer",
    "Detailed performance analysis and insights",
    "Track your progress in real-time",
    "Targeted recommendations for improvement",
    "Community support network",
    "Adaptive learning paths based on your strengths",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Navigation />

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-24 pb-32 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-5xl mx-auto space-y-10 animate-fade-in relative z-10">
            <div className="space-y-6">
              <div className="inline-block">
                <div className="px-6 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-6 inline-flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium text-primary">Every check leads to a point of progress.</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-slate-900">
                Master Your{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Cambridge and English Proficiency Exams
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Review and master key skills in Cambridge subjects for exam preparation.
              </p>
            </div>
            <div className="flex gap-4 justify-center flex-wrap pt-4">
              <Button
                size="lg"
                className="text-lg px-10 py-6 h-auto shadow-glow hover:shadow-elegant transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/auth")}
              >
                Start Learning Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-10 py-6 h-auto hover:bg-primary/5 border-primary/20"
                onClick={() => navigate("/exam-mastery")}
              >
                Explore Resources
              </Button>
            </div>
          </div>
        </section>

        {/* Main Features Section */}
        <section className="container mx-auto px-4 py-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4 animate-slide-up">
              <h2 className="text-4xl md:text-5xl font-bold">Everything You Need to Succeed</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Comprehensive tools and resources designed to accelerate your exam preparation
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {sections.map((section, index) => (
                <Card
                  key={index}
                  className="group glass-card hover-lift cursor-pointer overflow-hidden border-primary/10"
                  onClick={() => navigate(section.path)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        <section.icon className="w-8 h-8 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                    <CardTitle className="text-2xl mb-2">{section.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">{section.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-24">
          <div className="max-w-6xl mx-auto">
            <Card className="glass-card border-primary/10 shadow-glow overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
              <CardContent className="p-12 md:p-16 relative">
                <div className="text-center mb-12 space-y-4">
                  <h2 className="text-4xl md:text-5xl font-bold">Why Choose Check'n'Point AI?</h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Powered by advanced AI to provide personalized learning experiences
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-lg leading-relaxed pt-1.5">{feature}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-24">
          <Card className="max-w-4xl mx-auto shadow-glow bg-gradient-primary text-white border-0 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
            <CardContent className="p-12 md:p-16 text-center space-y-8 relative">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold">Ready to Excel in Your Exams?</h2>
                <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                  Join thousands of students achieving their academic goals with AI-powered personalized feedback
                </p>
              </div>
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-10 py-6 h-auto hover:scale-105 transition-transform duration-300 shadow-lg"
                onClick={() => navigate("/auth")}
              >
                Start Learning Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Contact Section */}
        <section className="container mx-auto px-4 py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold">Get in Touch</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We're here to help you succeed. Reach out through any of these channels
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="group glass-card hover-lift border-primary/10">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl mb-2">Email Us</CardTitle>
                  <CardDescription className="text-base">
                    Get in touch via email for any inquiries or support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-lg font-medium">Ms Linh Dang</p>
                      <a
                        href="mailto:Linh.dt@vashanoi.edu.vn"
                        className="text-primary hover:text-primary/80 font-medium text-lg flex items-center gap-2 group/link transition-colors"
                      >
                        linh.dt@vashanoi.edu.vn
                        <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                      </a>
                    </div>
                    <div>
                      <p className="text-lg font-medium">VAS Hanoi </p>
                      <a
                        href="checknpoint@vashanoi.edu.vn"
                        className="text-primary hover:text-primary/80 font-medium text-lg flex items-center gap-2 group/link transition-colors"
                      >
                        checknpoint@vashanoi.edu.vn
                        <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="group glass-card hover-lift border-primary/10">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl mb-2">Visit Our VAS Hanoi Website</CardTitle>
                  <CardDescription className="text-base">
                    Join our community for peer support and discussions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href="https://vashanoi.edu.vn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full justify-between group-hover:bg-primary/5 border-primary/20 inline-flex items-center px-4 py-2 rounded-md border"
                  >
                    VAS Hanoi Website
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card/80 backdrop-blur-sm py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <BookOpen className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold">Check'n'Point AI</span>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your personalized feedback agent for Cambridge & English Proficiency Exams
            </p>
            <p className="text-sm text-muted-foreground pt-4">© 2025 Check'n'Point AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
