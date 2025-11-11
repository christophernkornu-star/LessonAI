import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Sparkles, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Generation",
      description: "Advanced AI fills your lesson note template with precise, curriculum-aligned content",
    },
    {
      icon: Clock,
      title: "Save Hours of Work",
      description: "Generate professional lesson notes in minutes instead of hours of manual work",
    },
    {
      icon: CheckCircle,
      title: "Curriculum-Aligned",
      description: "Perfectly matches your curriculum standards, strands, and exemplars",
    },
    {
      icon: BookOpen,
      title: "Multiple Templates",
      description: "Use your own templates or choose from our curated collection",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">LessonAI</h1>
            <div className="flex gap-3">
              <Button variant="ghost">Sign In</Button>
              <Button className="bg-gradient-hero hover:opacity-90">Get Started</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
            <Sparkles className="h-4 w-4" />
            AI-Powered Lesson Planning
          </div>
          <h2 className="mb-6 text-5xl font-bold leading-tight text-foreground md:text-6xl">
            Create Professional
            <br />
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Lesson Notes in Minutes
            </span>
          </h2>
          <p className="mb-8 text-xl text-muted-foreground">
            Upload your template, select your curriculum, and let AI generate comprehensive,
            standards-aligned lesson notes tailored to your teaching needs
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
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h3 className="mb-3 text-3xl font-bold text-foreground">
              Everything You Need for Perfect Lesson Notes
            </h3>
            <p className="text-muted-foreground">
              Powerful features designed specifically for educators
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="p-6 shadow-soft transition-all hover:shadow-medium"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                    <Icon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <h4 className="mb-2 text-xl font-semibold text-foreground">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h3 className="mb-3 text-3xl font-bold text-foreground">How It Works</h3>
            <p className="text-muted-foreground">
              Three simple steps to your perfect lesson note
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
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
      <section className="container mx-auto px-4 py-20">
        <Card className="overflow-hidden bg-gradient-hero p-12 text-center shadow-medium">
          <h3 className="mb-4 text-3xl font-bold text-primary-foreground">
            Ready to Transform Your Lesson Planning?
          </h3>
          <p className="mb-8 text-lg text-primary-foreground/90">
            Join hundreds of teachers saving time with AI-powered lesson notes
          </p>
          <Button
            onClick={() => navigate("/generator")}
            size="lg"
            variant="secondary"
            className="shadow-soft"
          >
            Get Started Now
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 LessonAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
