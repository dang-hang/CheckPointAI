import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Clock, Target, BookOpen, Brain, CheckCircle2 } from "lucide-react";

const StudyInsights = () => {
  const tips = [
    {
      title: "Create a Study Schedule",
      description:
        "Consistency is key to exam success. Set aside dedicated study time each day and stick to it. Use time-blocking techniques to allocate specific subjects to different time slots.",
      icon: Clock,
      category: "Time Management",
    },
    {
      title: "Active Learning Techniques",
      description:
        "Don't just read—engage with the material. Use techniques like self-testing, summarizing in your own words, and teaching concepts to others to reinforce learning.",
      icon: Brain,
      category: "Study Methods",
    },
    {
      title: "Practice with Past Papers",
      description:
        "Familiarize yourself with exam formats by practicing with past papers. This helps you understand question patterns, manage time effectively, and identify knowledge gaps.",
      icon: BookOpen,
      category: "Exam Preparation",
    },
    {
      title: "Set SMART Goals",
      description:
        "Make your goals Specific, Measurable, Achievable, Relevant, and Time-bound. Break large objectives into smaller milestones to maintain motivation and track progress.",
      icon: Target,
      category: "Goal Setting",
    },
    {
      title: "Spaced Repetition",
      description:
        "Review material at increasing intervals over time. This scientifically-proven technique strengthens long-term memory retention and reduces cramming stress.",
      icon: CheckCircle2,
      category: "Memory Techniques",
    },
    {
      title: "Understand, Don't Memorize",
      description:
        "Focus on understanding concepts rather than rote memorization. Connect new information to what you already know, and ask 'why' and 'how' to deepen comprehension.",
      icon: Lightbulb,
      category: "Learning Strategy",
    },
  ];

  const strategies = [
    {
      title: "Before the Exam",
      points: [
        "Review your study notes and highlight key concepts",
        "Get adequate sleep the night before",
        "Prepare all necessary materials (ID, pens, calculator)",
        "Arrive early to reduce stress and settle in",
      ],
    },
    {
      title: "During the Exam",
      points: [
        "Read all instructions carefully before starting",
        "Skim through all questions to plan your time",
        "Answer easy questions first to build confidence",
        "Check your work if time permits",
      ],
    },
    {
      title: "Managing Stress",
      points: [
        "Practice deep breathing exercises",
        "Take short breaks during long study sessions",
        "Maintain a healthy lifestyle with exercise and nutrition",
        "Stay positive and visualize success",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Expert{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Study Insights
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Proven strategies and tips to maximize your learning efficiency and exam performance
          </p>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Essential Study Tips</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tips.map((tip, index) => (
              <Card
                key={index}
                className="hover:shadow-elegant transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-3">
                    <tip.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-xs text-primary font-semibold mb-2">
                    {tip.category}
                  </div>
                  <CardTitle className="text-xl">{tip.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{tip.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8">Exam Strategies</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {strategies.map((strategy, index) => (
              <Card key={index} className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-xl">{strategy.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {strategy.points.map((point, pIndex) => (
                      <li key={pIndex} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="shadow-elegant bg-gradient-primary text-white border-0">
          <CardContent className="p-12 text-center space-y-6">
            <Lightbulb className="w-16 h-16 mx-auto" />
            <h3 className="text-3xl font-bold">Remember: Success is a Journey</h3>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              Everyone learns differently. Experiment with these strategies to find what works best
              for you. Stay consistent, stay positive, and keep growing!
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudyInsights;
