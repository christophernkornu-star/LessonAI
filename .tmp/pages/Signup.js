import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { getSystemSetting } from "@/services/adminService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
export default function Signup() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSignupsEnabled, setIsSignupsEnabled] = useState(true);
    const [checkingInfo, setCheckingInfo] = useState(true);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    useEffect(() => {
        checkSignupStatus();
    }, []);
    const checkSignupStatus = async () => {
        try {
            const enabled = await getSystemSetting('allow_signups');
            setIsSignupsEnabled(enabled);
        }
        catch (error) {
            console.error("Failed to check signup status", error);
        }
        finally {
            setCheckingInfo(false);
        }
    };
    const handleSignup = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast({
                title: "Password Mismatch",
                description: "Passwords do not match. Please try again.",
                variant: "destructive",
            });
            return;
        }
        if (formData.password.length < 6) {
            toast({
                title: "Weak Password",
                description: "Password must be at least 6 characters long.",
                variant: "destructive",
            });
            return;
        }
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName,
                    },
                },
            });
            if (error)
                throw error;
            toast({
                title: "Account Created!",
                description: "Welcome to LessonAI. Let's create amazing lesson notes!",
            });
            navigate("/dashboard");
        }
        catch (error) {
            toast({
                title: "Signup Failed",
                description: error.message || "An error occurred. Please try again.",
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    if (checkingInfo) {
        return null; // or a loading spinner
    }
    return (_jsxs("div", { className: "min-h-screen relative flex items-center justify-center bg-slate-50 dark:bg-background overflow-hidden p-4", children: [_jsx("div", { className: "absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" }), _jsx("div", { className: "absolute top-0 -right-4 w-72 h-72 bg-blue-300/20 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" }), _jsx("div", { className: "absolute -bottom-8 left-20 w-72 h-72 bg-purple-300/20 dark:bg-purple-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" }), _jsxs("div", { className: "relative w-full max-w-[900px] flex flex-col md:flex-row bg-card/60 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-xl overflow-hidden border border-white/20 dark:border-white/10", children: [_jsxs("div", { className: "hidden md:flex md:w-5/12 bg-gradient-to-br from-primary/90 to-primary p-12 flex-col justify-center text-primary-foreground relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10" }), _jsx("div", { className: "relative z-10", children: _jsxs(Link, { to: "/", className: "inline-flex items-center gap-4 hover:opacity-80 transition-opacity", children: [_jsx("div", { className: "bg-white/10 p-3 rounded-xl backdrop-blur-sm", children: _jsx("img", { src: "/LessonAi.png", alt: "LessonAi Logo", className: "h-14 w-14 object-contain" }) }), _jsx("span", { className: "font-bold text-4xl tracking-tight text-white", children: "LessonAi" })] }) }), _jsxs("div", { className: "relative z-10 mt-16 mb-8", children: [_jsx("h2", { className: "text-2xl font-bold text-white mb-6 leading-tight", children: "Start generating lesson notes today." }), _jsx("p", { className: "text-primary-foreground/80 leading-relaxed text-lg", children: "Join thousands of educators saving hours each week by generating professional, curriculum-aligned lesson notes in seconds." })] })] }), _jsxs("div", { className: "w-full md:w-7/12 p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-card", children: [_jsx("div", { className: "md:hidden flex items-center justify-center mb-8", children: _jsx("div", { className: "bg-primary/5 p-3 rounded-2xl", children: _jsx("img", { src: "/LessonAi.png", alt: "LessonAi Logo", className: "h-10 w-10 object-contain" }) }) }), _jsxs("div", { className: "mb-8 text-center md:text-left", children: [_jsx("h1", { className: "text-2xl sm:text-3xl font-bold text-foreground mb-2 tracking-tight", children: "Create Account" }), _jsx("p", { className: "text-muted-foreground", children: "Join thousands of teachers using LessonAI." })] }), !isSignupsEnabled ? (_jsxs(Alert, { variant: "destructive", className: "mb-6", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), _jsx(AlertTitle, { children: "Registration Closed" }), _jsx(AlertDescription, { children: "New account registration is currently disabled by the administrator. Please try again later." })] })) : (_jsxs("form", { onSubmit: handleSignup, className: "space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "fullName", className: "text-sm font-medium", children: "Full Name" }), _jsx(Input, { id: "fullName", type: "text", placeholder: "John Doe", value: formData.fullName, onChange: (e) => setFormData({ ...formData, fullName: e.target.value }), required: true, disabled: isLoading || !isSignupsEnabled, className: "h-10 sm:h-11 bg-secondary/30 focus-visible:bg-background transition-colors" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "email", className: "text-sm font-medium", children: "Email address" }), _jsx(Input, { id: "email", type: "email", placeholder: "teacher@school.com", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }), required: true, disabled: isLoading || !isSignupsEnabled, className: "h-10 sm:h-11 bg-secondary/30 focus-visible:bg-background transition-colors" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "password", className: "text-sm font-medium", children: "Password" }), _jsx(Input, { id: "password", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: formData.password, onChange: (e) => setFormData({ ...formData, password: e.target.value }), required: true, disabled: isLoading || !isSignupsEnabled, className: "h-10 sm:h-11 bg-secondary/30 focus-visible:bg-background transition-colors" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "confirmPassword", className: "text-sm font-medium", children: "Confirm Password" }), _jsx(Input, { id: "confirmPassword", type: "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: formData.confirmPassword, onChange: (e) => setFormData({ ...formData, confirmPassword: e.target.value }), required: true, disabled: isLoading || !isSignupsEnabled, className: "h-10 sm:h-11 bg-secondary/30 focus-visible:bg-background transition-colors" })] })] }), _jsx(Button, { type: "submit", className: "w-full h-10 sm:h-11 text-base font-medium mt-6 shadow-sm transition-all hover:shadow-md active:scale-[0.98]", disabled: isLoading, children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-5 w-5 animate-spin" }), "Creating account..."] })) : ("Create Account") })] })), _jsx("div", { className: "mt-6 text-center", children: _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Already have an account?", " ", _jsx(Link, { to: "/login", className: "text-primary hover:underline font-semibold transition-colors hover:text-primary/80", children: "Sign in" })] }) }), _jsxs("div", { className: "mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4", children: [_jsxs(Link, { to: "/", className: "inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 group px-4 py-2 rounded-full hover:bg-secondary/40", children: [_jsx(ArrowLeft, { className: "w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" }), _jsx("span", { className: "font-medium", children: "Back to Home" })] }), _jsxs("a", { href: "https://wa.me/233240376088", target: "_blank", rel: "noopener noreferrer", className: "inline-flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-500 hover:text-green-500 dark:hover:text-green-400 transition-colors font-medium px-4 py-2 bg-green-50 dark:bg-green-950/20 rounded-full", children: [_jsx("svg", { viewBox: "0 0 24 24", className: "w-5 h-5 fill-current", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { d: "M11.42 21.815a10 10 0 01-5.11-1.39l-4.31 1.13 1.15-4.2a9.98 9.98 0 01-1.35-5.065c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zM17.5 14.33c-.33-.16-1.95-.96-2.25-1.07-.3-.11-.53-.16-.76.16-.23.33-.86 1.07-1.05 1.28-.19.22-.38.24-.72.08-.34-.16-1.4-.51-2.66-1.44-.98-.71-1.64-1.6-1.83-1.93-.19-.33-.02-.51.15-.68.16-.16.34-.33.51-.5.16-.16.22-.27.33-.45.11-.18.06-.34-.03-.5-.08-.16-.76-1.83-1.04-2.51-.27-.66-.54-.57-.76-.58-.2-.01-.43-.01-.66-.01-.23 0-.61.08-.88.39-.27.31-1.03 1.01-1.03 2.45 0 1.44 1.05 2.84 1.2 3.05.15.2 2.08 3.19 5.04 4.46.7.3 1.25.48 1.68.61.7.22 1.34.19 1.84.12.56-.08 1.95-.79 2.22-1.56.27-.76.27-1.41.19-1.56-.08-.15-.3-.22-.64-.38z" }) }), _jsx("span", { children: "Need help? WhatsApp us" })] })] })] })] })] }));
}
