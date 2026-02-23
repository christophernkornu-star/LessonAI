import { useEffect, Suspense, lazy, ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Helper to retry lazy loading on chunk load errors (e.g., after a new deployment)
const lazyWithRetry = (componentImport: () => Promise<{ default: ComponentType<any> }>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assuming that the user is not on the latest version of the application.
        // Let's refresh the page immediately.
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        // Return a promise that never resolves to prevent React from rendering the error
        return new Promise<{ default: ComponentType<any> }>(() => {});
      }

      // The page has already been reloaded
      // Assuming that user is already using the latest version of the application.
      // Let's let the application crash and raise the error.
      throw error;
    }
  });

// Lazy load pages
const Index = lazyWithRetry(() => import("./pages/Index"));
const ImprovedGenerator = lazyWithRetry(() => import("./pages/ImprovedGenerator"));
const Checkout = lazyWithRetry(() => import("./pages/Checkout"));
const Download = lazyWithRetry(() => import("./pages/Download"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Signup = lazyWithRetry(() => import("./pages/Signup"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const ProfileEdit = lazyWithRetry(() => import("./pages/ProfileEdit"));
const TemplateManagement = lazyWithRetry(() => import("./pages/TemplateManagement"));
const AssessmentGenerator = lazyWithRetry(() => import("./pages/AssessmentGenerator"));
const CurriculumUpload = lazyWithRetry(() => import("./pages/CurriculumUpload"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const SchemeOfLearning = lazyWithRetry(() => import("./pages/SchemeOfLearning"));
const TimetableManagement = lazyWithRetry(() => import("./pages/TimetableManagement"));

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
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Session error:", error);
          if (error.message.includes("Refresh Token") || error.message.includes("refresh_token_not_found")) {
            // Clear invalid session data
            await supabase.auth.signOut().catch(console.error);
            localStorage.removeItem('sb-uihhwjloceffyksuscmg-auth-token');
            // Also clear any other supabase tokens to be safe
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
              }
            });
            window.location.href = '/login';
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
      } catch (e) {
        console.error("Unexpected auth error:", e);
      }
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_ERRORED' as any) {
        // Ensure local storage is cleared
        localStorage.removeItem('sb-uihhwjloceffyksuscmg-auth-token');
        
        // Clear application specific data to prevent data leaking between users
        localStorage.removeItem('scheme_of_learning_data');
        localStorage.removeItem('batch_form_data');
        
        // Clear draft data
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
          if (key.startsWith('draft_')) {
            localStorage.removeItem(key);
          }
        });

        if (event === 'TOKEN_REFRESH_ERRORED' as any) {
           window.location.href = '/login';
        }
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
