import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, FileEdit, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const WritingPrompts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('writing_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error: any) {
      console.error('Error loading prompts:', error);
      toast({
        title: "Error",
        description: "Failed to load writing prompts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500';
      case 'intermediate':
        return 'bg-yellow-500';
      case 'advanced':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
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
            Writing Practice
          </h2>
          <p className="text-muted-foreground text-lg">
            Choose a writing prompt and get AI-powered feedback
          </p>
        </div>

        {prompts.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <FileEdit className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Writing Prompts Available</h3>
              <p className="text-muted-foreground mb-4">
                Your teacher hasn't created any writing prompts yet.
              </p>
              <Button onClick={() => navigate("/practice-hub")}>
                Back to Practice Hub
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt) => (
              <Card
                key={prompt.id}
                className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getDifficultyColor(prompt.difficulty)}>
                      {prompt.difficulty}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{prompt.time_limit} min</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{prompt.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {prompt.prompt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/writing-test/${prompt.id}`)}
                  >
                    <FileEdit className="w-4 h-4 mr-2" />
                    Start Writing
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default WritingPrompts;