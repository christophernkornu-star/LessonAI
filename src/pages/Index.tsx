import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Sparkles, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";

const Index = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkSession();
  }, []);

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Generation",
      description: "Advanced AI generates curriculum-aligned content based on Ghana's National Pre-tertiary Standards",
    },
    {
      icon: Clock,
      title: "Save Hours of Work",
      description: "Generate professional lesson notes in minutes for any subject from Basic 1 to Basic 10",
    },
    {
      icon: CheckCircle,
      title: "NPC-Aligned",
      description: "Perfectly aligned with National Pre-tertiary Curriculum strands, content standards, and learning indicators",
    },
    {
      icon: BookOpen,
      title: "Multiple Templates",
      description: "Use your own templates or choose from our curated collection",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-accent-foreground">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
            AI-Powered Lesson Planning
          </div>
          <h2 className="mb-4 sm:mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
            Create Professional
            <br />
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Lesson Notes in Minutes
            </span>
          </h2>
          <p className="mb-6 sm:mb-8 text-base sm:text-lg lg:text-xl text-muted-foreground px-4">
            Aligned with Ghana's National Pre-tertiary Curriculum. Generate comprehensive,
            standards-based lesson notes for Basic 1-10 tailored to Ghanaian teachers' needs
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              onClick={() => navigate("/generator")}
              size="lg"
              className="bg-gradient-hero hover:opacity-90"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Start Generating
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 sm:mb-12 text-center">
            <h3 className="mb-2 sm:mb-3 text-2xl sm:text-3xl font-bold text-foreground">
              Everything You Need for Perfect Lesson Notes
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground px-4">
              Powerful features designed specifically for Ghanaian educators
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="p-4 sm:p-6 shadow-soft transition-all hover:shadow-medium"
                >
                  <div className="mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-accent">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
                  </div>
                  <h4 className="mb-2 text-lg sm:text-xl font-semibold text-foreground">
                    {feature.title}
                  </h4>
                  <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 sm:mb-12 text-center">
            <h3 className="mb-2 sm:mb-3 text-2xl sm:text-3xl font-bold text-foreground">How It Works</h3>
            <p className="text-sm sm:text-base text-muted-foreground px-4">
              Three simple steps to your perfect lesson note
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Upload & Select",
                description: "Upload your template and choose curriculum, subject, and level",
              },
              {
                step: "2",
                title: "Add Details",
                description: "Input strand, content standards, and exemplars from your curriculum",
              },
              {
                step: "3",
                title: "Generate & Download",
                description: "AI creates your lesson note. Pay once and download instantly",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-hero text-2xl font-bold text-primary-foreground">
                    {item.step}
                  </div>
                </div>
                <h4 className="mb-2 text-xl font-semibold text-foreground">{item.title}</h4>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <Card className="overflow-hidden bg-gradient-hero p-6 sm:p-8 lg:p-12 text-center shadow-medium">
          <h3 className="mb-3 sm:mb-4 text-2xl sm:text-3xl font-bold text-primary-foreground">
            Ready to Transform Your Lesson Planning?
          </h3>
          <p className="mb-6 sm:mb-8 text-base sm:text-lg text-primary-foreground/90 px-4">
            Join hundreds of teachers saving time with AI-powered lesson notes
          </p>
          <Button
            onClick={() => navigate("/generator")}
            size="lg"
            variant="secondary"
            className="shadow-soft w-full sm:w-auto"
          >
            Get Started Now
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground">© 2024 LessonAI. All rights reserved.</p>
            <button
              onClick={() => navigate("/admin")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
