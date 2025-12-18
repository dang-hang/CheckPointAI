import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, Target, Lightbulb, Users, LogOut, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          checkTeacherStatus();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkTeacherStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkTeacherStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "teacher")
      .maybeSingle();

    setIsTeacher(!!roles);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed Out",
      description: "See you next time!",
    });
    navigate("/");
  };

  const navItems = [
    { path: "/", label: "Home", icon: BookOpen },
    { path: "/exam-mastery", label: "Exam Mastery", icon: GraduationCap },
    { path: "/practice-hub", label: "Practice Hub", icon: Target },
    { path: "/study-insights", label: "Study Insights", icon: Lightbulb },
    { path: "/community", label: "Classes", icon: Users },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <BookOpen className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Check'n'Point AI</h1>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-muted-foreground hidden md:block">
                  {user.user_metadata?.full_name || user.email}
                </span>
                {isTeacher && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/teacher")}
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden md:inline">Teacher</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")} size="sm">
                Sign In
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex overflow-x-auto gap-4 mt-4 pb-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-2 text-sm font-medium whitespace-nowrap px-3 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Navigation;
