import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const ImprovedGenerator = lazy(() => import("./pages/ImprovedGenerator"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Download = lazy(() => import("./pages/Download"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const TemplateManagement = lazy(() => import("./pages/TemplateManagement"));
const AssessmentGenerator = lazy(() => import("./pages/AssessmentGenerator"));
const CurriculumUpload = lazy(() => import("./pages/CurriculumUpload"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SchemeOfLearning = lazy(() => import("./pages/SchemeOfLearning"));
const TimetableManagement = lazy(() => import("./pages/TimetableManagement"));

const queryClient = new QueryClient();

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  useEffect(() => {
    // Handle Supabase auth errors (like invalid refresh token)
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Session error:", error);
        if (error.message.includes("Refresh Token")) {
          await supabase.auth.signOut();
        }
      } else if (session?.user) {
        // Verify suspension status on app load
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_suspended')
          .eq('id', session.user.id)
          .single();
          
        if ((profile as any)?.is_suspended) {
          console.log("User is suspended, signing out...");
          await supabase.auth.signOut();
          window.location.href = '/login'; // Force redirect
        }
      }
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Ensure local storage is cleared
        localStorage.removeItem('sb-uihhwjloceffyksuscmg-auth-token'); // Adjust key if needed or rely on supabase
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/templates" element={<TemplateManagement />} />
              <Route path="/assessments" element={<AssessmentGenerator />} />
              <Route path="/curriculum" element={<CurriculumUpload />} />
              <Route path="/curriculum-upload" element={<CurriculumUpload />} />
              <Route path="/scheme" element={<SchemeOfLearning />} />
              <Route path="/schemes" element={<SchemeOfLearning />} />
              <Route path="/generator" element={<ImprovedGenerator />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/download" element={<Download />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/timetable" element={<TimetableManagement />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
