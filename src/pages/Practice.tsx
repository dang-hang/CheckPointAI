import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, GraduationCap, Trophy, FileEdit, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  type: "multiple-choice" | "fill-blank" | "true-false";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface Test {
  id: string;
  category: string;
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  questions?: Question[] | null;
  parts?: { questions: Question[] }[] | null;
}

interface WritingPrompt {
  id: string;
  title: string;
  prompt: string;
  difficulty: string;
  time_limit: number;
  category: "Writing";
  description: string;
  duration: number;
}

type TestOrPrompt = Test | WritingPrompt;

const Practice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') as "IELTS" | "Checkpoint" | "ESL" | "Writing" | "Listening" | null;
  const [selectedCategory, setSelectedCategory] = useState<"all" | "IELTS" | "Checkpoint" | "ESL" | "Writing" | "Listening">(
    categoryParam || "all"
  );
  const [items, setItems] = useState<TestOrPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  useEffect(() => {
    loadAllItems();
  }, []);

  const loadAllItems = async () => {
    setLoading(true);
    
    // Load tests
    const { data: testsData, error: testsError } = await supabase
      .from("tests_public")
      .select("*")
      .order("created_at", { ascending: false });

    // Load writing prompts
    const { data: promptsData, error: promptsError } = await supabase
      .from("writing_prompts")
      .select("*")
      .order("created_at", { ascending: false });

    if (testsError) {
      toast({
        title: "Error loading tests",
        description: testsError.message,
        variant: "destructive",
      });
    }

    if (promptsError) {
      toast({
        title: "Error loading writing prompts",
        description: promptsError.message,
        variant: "destructive",
      });
    }

    const tests = (testsData || []) as unknown as Test[];
    const prompts = ((promptsData || []) as any[]).map(p => ({
      ...p,
      category: "Writing" as const,
      description: p.prompt.slice(0, 150) + (p.prompt.length > 150 ? "..." : ""),
      duration: p.time_limit,
    }));

    // Combine and sort by created_at date (newest first)
    const combined = [...tests, ...prompts].sort((a, b) => {
      const dateA = new Date((a as any).created_at || 0).getTime();
      const dateB = new Date((b as any).created_at || 0).getTime();
      return dateB - dateA;
    });

    setItems(combined);
    setLoading(false);
  };

  const filteredItems = selectedCategory === "all" 
    ? items 
    : items.filter(item => item.category === selectedCategory);

  const categories = [
    { value: "all" as const, label: "All", icon: BookOpen },
    { value: "IELTS" as const, label: "IELTS", icon: GraduationCap },
    { value: "Checkpoint" as const, label: "Checkpoint", icon: Trophy },
    { value: "ESL" as const, label: "ESL", icon: BookOpen },
    { value: "Writing" as const, label: "Writing", icon: FileEdit },
    { value: "Listening" as const, label: "Listening", icon: Volume2 },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-500";
      case "Intermediate":
        return "bg-secondary";
      case "Advanced":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const getQuestionCount = (item: TestOrPrompt) => {
    if (item.category === "Writing") return null;
    const test = item as Test;
    if (test.questions && Array.isArray(test.questions)) {
      return test.questions.length;
    }
    if (test.parts && Array.isArray(test.parts)) {
      return test.parts.reduce((sum, part) => sum + (part.questions?.length || 0), 0);
    }
    return 0;
  };

  const isWritingPrompt = (item: TestOrPrompt): item is WritingPrompt => {
    return item.category === "Writing";
  };

  const handleItemClick = (item: TestOrPrompt) => {
    if (isWritingPrompt(item)) {
      navigate(`/writing-test/${item.id}`);
    } else {
      navigate(`/practice/${item.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold mb-3">Choose a Test</h2>
          <p className="text-muted-foreground">
            Practice with sample tests to improve your English skills
          </p>
        </div>

        <div className="flex gap-3 mb-8 justify-center flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.value)}
              className="gap-2"
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Loading tests...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 flex flex-col"
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">{item.category}</Badge>
                  <Badge className={getDifficultyColor(item.difficulty)}>
                    {item.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{item.title}</CardTitle>
                <CardDescription className="text-base">
                  {item.description || (isWritingPrompt(item) ? item.prompt.slice(0, 150) : "")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {item.duration} min
                  </div>
                  {!isWritingPrompt(item) && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {getQuestionCount(item)} questions
                    </div>
                  )}
                  {isWritingPrompt(item) && (
                    <div className="flex items-center gap-1">
                      <FileEdit className="w-4 h-4" />
                      Writing
                    </div>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleItemClick(item)}
                >
                  {isWritingPrompt(item) ? "Start Writing" : "Start Test"}
                </Button>
              </CardContent>
            </Card>
            ))}
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No {selectedCategory === "all" ? "items" : selectedCategory + " items"} found
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Practice;
