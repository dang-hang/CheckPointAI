import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, GraduationCap, Trophy, MessageSquare } from "lucide-react";
import { User } from "@supabase/supabase-js";
import AIAssistant from "@/components/AIAssistant";
import Navigation from "@/components/Navigation";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const practiceCategories = [
    {
      title: "IELTS Practice",
      description: "Practice IELTS with sample tests and comprehensive exercises",
      icon: GraduationCap,
      color: "from-primary to-primary-glow",
    },
    {
      title: "Checkpoint Practice",
      description:
        "Review and master key skills in Cambridge subjects for exam preparation.",
      icon: BookOpen,
      color: "from-secondary to-orange-400",
    },
    {
      title: "ESL Activities",
      description: "Fun and effective ESL learning activities",
      icon: Trophy,
      color: "from-purple-500 to-pink-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Choose Your Learning Path
          </h2>
          <p className="text-muted-foreground text-lg">Select the program that fits your learning goals</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {practiceCategories.map((category, index) => (
            <Card
              key={index}
              className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            >
              <CardHeader>
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <category.icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">{category.title}</CardTitle>
                <CardDescription className="text-base">{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => navigate("/practice")}>
                  Start Learning
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-soft border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              <CardTitle>AI English Tutor</CardTitle>
            </div>
            <CardDescription>AI assistant ready to help you 24/7 with any English questions</CardDescription>
          </CardHeader>
          <CardContent>
            <AIAssistant />
          </CardContent>
        </Card>

        <Card className="shadow-soft mt-6">
          <CardContent className="py-6">
            <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/past-results")}>
              <Trophy className="w-5 h-5" />
              View Test History
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
