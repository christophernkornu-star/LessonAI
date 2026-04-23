import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Check if user is suspended
      if (data.session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_suspended')
          .eq('id', data.session.user.id)
          .single();

        if ((profile as any)?.is_suspended) {
          await supabase.auth.signOut();
          throw new Error("Your account has been suspended. Please contact support.");
        }
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-50 dark:bg-background overflow-hidden p-4">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-300/20 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-300/20 dark:bg-purple-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="relative w-full max-w-[900px] flex flex-col md:flex-row bg-card/60 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-xl overflow-hidden border border-white/20 dark:border-white/10">
        
        {/* Left Side: Branding / Info */}
        <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-primary/90 to-primary p-12 flex-col justify-center text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-4 hover:opacity-80 transition-opacity">
              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                <img src="/LessonAi.png" alt="LessonAi Logo" className="h-14 w-14 object-contain" />
              </div>
              <span className="font-bold text-4xl tracking-tight text-white">LessonAi</span>
            </Link>
          </div>
          
          <div className="relative z-10 mt-16 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 leading-tight">Empower your teaching with AI.</h2>
            <p className="text-primary-foreground/80 leading-relaxed text-lg">
              Join thousands of educators saving hours each week by generating professional, curriculum-aligned lesson notes in seconds.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-7/12 p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-card">
          <div className="md:hidden flex items-center justify-center mb-8">
             <div className="bg-primary/5 p-3 rounded-2xl">
               <img src="/LessonAi.png" alt="LessonAi Logo" className="h-10 w-10 object-contain" />
             </div>
          </div>

          <div className="mb-8 text-center md:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="teacher@school.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
                className="h-11 bg-secondary/30 focus-visible:bg-background transition-colors"
              />
            </div>

            <div className="space-y-2.5">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
                className="h-11 bg-secondary/30 focus-visible:bg-background transition-colors"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium mt-2 shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline font-medium transition-colors hover:text-primary/80">
              Forgot your password?
            </Link>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-semibold transition-colors hover:text-primary/80">
                Sign up for free
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 group px-4 py-2 rounded-full hover:bg-secondary/40">
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
              <span className="font-medium">Back to Home</span>
            </Link>

            <a href="https://wa.me/233240376088" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-500 hover:text-green-500 dark:hover:text-green-400 transition-colors font-medium px-4 py-2 bg-green-50 dark:bg-green-950/20 rounded-full">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.42 21.815a10 10 0 01-5.11-1.39l-4.31 1.13 1.15-4.2a9.98 9.98 0 01-1.35-5.065c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zM17.5 14.33c-.33-.16-1.95-.96-2.25-1.07-.3-.11-.53-.16-.76.16-.23.33-.86 1.07-1.05 1.28-.19.22-.38.24-.72.08-.34-.16-1.4-.51-2.66-1.44-.98-.71-1.64-1.6-1.83-1.93-.19-.33-.02-.51.15-.68.16-.16.34-.33.51-.5.16-.16.22-.27.33-.45.11-.18.06-.34-.03-.5-.08-.16-.76-1.83-1.04-2.51-.27-.66-.54-.57-.76-.58-.2-.01-.43-.01-.66-.01-.23 0-.61.08-.88.39-.27.31-1.03 1.01-1.03 2.45 0 1.44 1.05 2.84 1.2 3.05.15.2 2.08 3.19 5.04 4.46.7.3 1.25.48 1.68.61.7.22 1.34.19 1.84.12.56-.08 1.95-.79 2.22-1.56.27-.76.27-1.41.19-1.56-.08-.15-.3-.22-.64-.38z"/>
              </svg>
              <span>Need help? WhatsApp us</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
