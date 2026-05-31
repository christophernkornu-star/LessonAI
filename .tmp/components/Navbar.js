import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, } from "@/components/ui/sheet";
import { Menu, Sparkles, LayoutDashboard, LogOut, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ContactDeveloperDialog } from "./ContactDeveloperDialog";
export function Navbar() {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsLoggedIn(!!session);
        };
        checkSession();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsLoggedIn(!!session);
        });
        return () => subscription.unsubscribe();
    }, []);
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate("/");
        setIsOpen(false);
    };
    const NavItems = () => (_jsx(_Fragment, { children: isLoggedIn ? (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "ghost", className: "justify-start w-full sm:w-auto", onClick: () => { navigate("/dashboard"); setIsOpen(false); }, children: [_jsx(LayoutDashboard, { className: "mr-2 h-4 w-4" }), "Dashboard"] }), _jsxs(Button, { variant: "ghost", className: "justify-start w-full sm:w-auto", onClick: () => { navigate("/generator"); setIsOpen(false); }, children: [_jsx(Sparkles, { className: "mr-2 h-4 w-4" }), "Generate"] }), _jsx(ContactDeveloperDialog, { children: _jsxs(Button, { variant: "ghost", className: "justify-start w-full sm:w-auto", onClick: () => setIsOpen(false), children: [_jsx(LifeBuoy, { className: "mr-2 h-4 w-4" }), "Contact"] }) }), _jsxs(Button, { variant: "ghost", className: "justify-start w-full sm:w-auto mobile-only sm:hidden", onClick: handleSignOut, children: [_jsx(LogOut, { className: "mr-2 h-4 w-4" }), "Sign Out"] }), _jsx(Button, { variant: "outline", className: "hidden sm:inline-flex", onClick: handleSignOut, children: "Sign Out" })] })) : (_jsxs(_Fragment, { children: [_jsx(ContactDeveloperDialog, { children: _jsx(Button, { variant: "ghost", className: "justify-start w-full sm:w-auto", children: "Contact" }) }), _jsx(Button, { variant: "ghost", className: "justify-start w-full sm:w-auto", onClick: () => { navigate("/login"); setIsOpen(false); }, children: "Sign In" }), _jsx(Button, { className: "bg-gradient-hero hover:opacity-90 justify-start w-full sm:w-auto", onClick: () => { navigate("/signup"); setIsOpen(false); }, children: "Get Started" })] })) }));
    return (_jsxs("header", { className: "sticky top-0 z-50 shadow-sm border-b border-primary/10 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60", children: [_jsx("div", { className: "absolute inset-0 -z-10 bg-gradient-to-r from-primary/10 via-blue-500/5 to-secondary/10 pointer-events-none" }), _jsx("div", { className: "container relative mx-auto px-4 py-3 sm:py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs(Link, { to: "/", className: "flex items-center gap-2 hover:scale-105 transition-transform duration-300", onClick: () => setIsOpen(false), children: [_jsx("div", { className: "flex bg-primary/10 p-1.5 rounded-lg items-center justify-center", children: _jsx("img", { src: "/LessonAi.png", alt: "LessonAi Logo", className: "h-6 w-6 object-contain" }) }), _jsx("h1", { className: "text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent", children: "LessonAI" })] }), _jsx("div", { className: "hidden md:flex gap-2 sm:gap-3 items-center", children: _jsx(NavItems, {}) }), _jsx("div", { className: "md:hidden", children: _jsxs(Sheet, { open: isOpen, onOpenChange: setIsOpen, children: [_jsx(SheetTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", size: "icon", children: [_jsx(Menu, { className: "h-6 w-6" }), _jsx("span", { className: "sr-only", children: "Toggle menu" })] }) }), _jsxs(SheetContent, { side: "right", children: [_jsxs(SheetHeader, { children: [_jsx(SheetTitle, { children: "Menu" }), _jsx(SheetDescription, { className: "sr-only", children: "Navigation menu for mobile devices" })] }), _jsx("div", { className: "flex flex-col gap-4 mt-6", children: _jsx(NavItems, {}) })] })] }) })] }) })] }));
}
