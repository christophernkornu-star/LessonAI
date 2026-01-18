import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import ImprovedGenerator from "./pages/ImprovedGenerator";
import Checkout from "./pages/Checkout";
import Download from "./pages/Download";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ProfileEdit from "./pages/ProfileEdit";
import TemplateManagement from "./pages/TemplateManagement";
import AssessmentGenerator from "./pages/AssessmentGenerator";
import CurriculumUpload from "./pages/CurriculumUpload";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import SchemeOfLearning from "./pages/SchemeOfLearning";
import TimetableManagement from "./pages/TimetableManagement";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Handle Supabase auth errors (like invalid refresh token)
    const checkSession = async () => {
      const { error } = await supabase.auth.getSession();
      if (error) {
        console.error("Session error:", error);
        if (error.message.includes("Refresh Token")) {
          await supabase.auth.signOut();
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
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
