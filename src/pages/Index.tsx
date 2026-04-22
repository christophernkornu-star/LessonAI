import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Clock, CheckCircle, ArrowRight, Bot, Zap, Filter } from "lucide-react";
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
      icon: Bot,
      title: "AI-Powered Generation",
      description: "Advanced AI generates curriculum-aligned content tailored precisely to Ghana's Pre-tertiary Standards",
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
      icon: Filter,
      title: "Flexible Templates",
      description: "Upload and use your own templates or seamlessly choose from our expertly curated collection",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pb-32 container mx-auto px-4">
        {/* Abstract Background Shapes */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-40 blur-[100px]"></div>

        <div className="mx-auto max-w-5xl text-center flex flex-col items-center">
          <div className="mb-6 inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur-md">
            <span>AI-Powered Lesson Planning for Ghana</span>
          </div>
          <h1 className="mb-8 text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl leading-tight">
            Create Professional <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-primary via-blue-500 to-secondary bg-clip-text text-transparent">
              Lesson Notes in Minutes
            </span>
          </h1>
          <p className="mb-10 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Aligned with Ghana's National Curriculum. Generate comprehensive,
            standards-based lesson notes for Basic 1-10 tailored specifically to Ghanaian teachers' needs.
          </p>
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row justify-center items-center">
            <Button
              onClick={() => navigate("/generator")}
              size="lg"
              className="h-14 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-300"
            >
              Start Generating
            </Button>
            <Button
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              size="lg" 
              variant="outline"
              className="h-14 px-8 text-base font-medium border-border/50 hover:bg-muted"
            >
              See How It Works
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative container mx-auto px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center max-w-3xl mx-auto">
            <h2 className="mb-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              Everything You Need for Perfect Lesson Notes
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed specifically to streamline workflow for Ghanaian educators.
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 p-6 sm:p-8 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative z-10">
                    <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-muted/30 border-y border-border/50 py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="mb-16 text-center text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              <h2>How It Works</h2>
              <p className="mt-4 text-lg font-normal text-muted-foreground text-center">
                Three simple steps to your perfect lesson note
              </p>
            </div>

            <div className="relative grid gap-12 md:grid-cols-3">
              <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] bg-border/60 -z-10" />
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
              ].map((item, i) => (
                <div key={item.step} className="group relative text-center">
                  <div className="mb-6 flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-background border-2 border-border shadow-md group-hover:border-primary group-hover:shadow-primary/20 transition-all duration-300">
                      <span className="bg-gradient-to-br from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent">
                        {item.step}
                      </span>
                    </div>
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed px-4">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 sm:py-32">
        <Card className="relative overflow-hidden border-0 bg-primary p-8 sm:p-12 lg:p-16 text-center shadow-2xl">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px]" />
          <div className="relative z-10 mx-auto max-w-3xl flex flex-col items-center">
            <Zap className="h-12 w-12 text-primary-foreground mb-6 inline-block opacity-80" />
            <h2 className="mb-6 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-primary-foreground">
              Ready to Transform Your Lesson Planning?
            </h2>
            <p className="mb-10 text-lg sm:text-xl text-primary-foreground/90 leading-relaxed font-medium">
              Join hundreds of educators across Ghana saving valuable time with AI-powered, meticulously aligned lesson notes.
            </p>
            <Button
              onClick={() => navigate("/generator")}
              size="lg"
              variant="secondary"
              className="h-14 px-8 text-lg font-bold shadow-xl hover:scale-105 transition-transform duration-300 w-full sm:w-auto text-primary"
            >
              Get Started Now — It's Fast
            </Button>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/50 backdrop-blur-md py-10 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">LessonAI</span>
            </div>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} LessonAI. All rights reserved.</p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate("/admin")}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-md hover:bg-muted"
              >
                Admin Portal
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
