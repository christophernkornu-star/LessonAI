import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
// Helper to retry lazy loading on chunk load errors (e.g., after a new deployment)
const lazyWithRetry = (componentImport) => lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false');
    try {
        const component = await componentImport();
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
        return component;
    }
    catch (error) {
        if (!pageHasAlreadyBeenForceRefreshed) {
            // Assuming that the user is not on the latest version of the application.
            // Let's refresh the page immediately.
            window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
            window.location.reload();
            // Return a promise that never resolves to prevent React from rendering the error
            return new Promise(() => { });
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
const PageLoader = () => (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-primary" }) }));
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
                }
                else if (session?.user) {
                    // Verify suspension status on app load
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('is_suspended')
                        .eq('id', session.user.id)
                        .single();
                    if (profile?.is_suspended) {
                        console.log("User is suspended, signing out...");
                        await supabase.auth.signOut();
                        window.location.href = '/login'; // Force redirect
                    }
                }
            }
            catch (e) {
                console.error("Unexpected auth error:", e);
            }
        };
        checkSession();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESH_ERRORED') {
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
                if (event === 'TOKEN_REFRESH_ERRORED') {
                    window.location.href = '/login';
                }
            }
        });
        return () => subscription.unsubscribe();
    }, []);
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsxs(TooltipProvider, { children: [_jsx(Toaster, {}), _jsx(Sonner, {}), _jsx(BrowserRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true }, children: _jsx(Suspense, { fallback: _jsx(PageLoader, {}), children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Index, {}) }), _jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/signup", element: _jsx(Signup, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/profile/edit", element: _jsx(ProfileEdit, {}) }), _jsx(Route, { path: "/templates", element: _jsx(TemplateManagement, {}) }), _jsx(Route, { path: "/assessments", element: _jsx(AssessmentGenerator, {}) }), _jsx(Route, { path: "/curriculum", element: _jsx(CurriculumUpload, {}) }), _jsx(Route, { path: "/curriculum-upload", element: _jsx(CurriculumUpload, {}) }), _jsx(Route, { path: "/scheme", element: _jsx(SchemeOfLearning, {}) }), _jsx(Route, { path: "/schemes", element: _jsx(SchemeOfLearning, {}) }), _jsx(Route, { path: "/generator", element: _jsx(ImprovedGenerator, {}) }), _jsx(Route, { path: "/checkout", element: _jsx(Checkout, {}) }), _jsx(Route, { path: "/download", element: _jsx(Download, {}) }), _jsx(Route, { path: "/admin", element: _jsx(AdminLogin, {}) }), _jsx(Route, { path: "/admin/dashboard", element: _jsx(AdminDashboard, {}) }), _jsx(Route, { path: "/admin-dashboard", element: _jsx(AdminDashboard, {}) }), _jsx(Route, { path: "/timetable", element: _jsx(TimetableManagement, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) }) })] }) }));
};
export default App;
