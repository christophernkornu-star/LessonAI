import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Clock, CheckCircle, ArrowRight, Bot, Zap, Filter } from "lucide-react";
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
    return (_jsxs("div", { className: "min-h-screen bg-background text-foreground flex flex-col font-sans", children: [_jsx(Navbar, {}), _jsxs("section", { className: "relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pb-32 container mx-auto px-4", children: [_jsx("div", { className: "absolute inset-0 -z-10 h-full w-full bg-white dark:bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" }), _jsx("div", { className: "absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-40 blur-[100px]" }), _jsxs("div", { className: "mx-auto max-w-5xl text-center flex flex-col items-center", children: [_jsxs("div", { className: "mb-6 inline-flex animate-fade-in-up items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur-md", children: [_jsx(Sparkles, { className: "h-4 w-4" }), _jsx("span", { children: "AI-Powered Lesson Planning for Ghana" })] }), _jsxs("h1", { className: "mb-8 text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl leading-tight", children: ["Create Professional ", _jsx("br", { className: "hidden sm:block" }), _jsx("span", { className: "bg-gradient-to-r from-primary via-blue-500 to-secondary bg-clip-text text-transparent", children: "Lesson Notes in Minutes" })] }), _jsx("p", { className: "mb-10 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed", children: "Aligned with Ghana's National Curriculum. Generate comprehensive, standards-based lesson notes for Basic 1-10 tailored specifically to Ghanaian teachers' needs." }), _jsxs("div", { className: "flex w-full flex-col gap-4 sm:w-auto sm:flex-row justify-center items-center", children: [_jsxs(Button, { onClick: () => navigate("/generator"), size: "lg", className: "h-14 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-300", children: [_jsx(Sparkles, { className: "mr-2 h-5 w-5" }), "Start Generating Free"] }), _jsxs(Button, { onClick: () => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }), size: "lg", variant: "outline", className: "h-14 px-8 text-base font-medium border-border/50 hover:bg-muted", children: ["See How It Works", _jsx(ArrowRight, { className: "ml-2 h-4 w-4" })] })] })] })] }), _jsx("section", { className: "relative container mx-auto px-4 py-16 sm:py-24", children: _jsxs("div", { className: "mx-auto max-w-6xl", children: [_jsxs("div", { className: "mb-16 text-center max-w-3xl mx-auto", children: [_jsx("h2", { className: "mb-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground", children: "Everything You Need for Perfect Lesson Notes" }), _jsx("p", { className: "text-lg text-muted-foreground", children: "Powerful features designed specifically to streamline workflow for Ghanaian educators." })] }), _jsx("div", { className: "grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4", children: features.map((feature, index) => {
                                const Icon = feature.icon;
                                return (_jsxs(Card, { className: "group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 p-6 sm:p-8 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" }), _jsxs("div", { className: "relative z-10", children: [_jsx("div", { className: "mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300", children: _jsx(Icon, { className: "h-6 w-6" }) }), _jsx("h3", { className: "mb-3 text-xl font-bold text-foreground", children: feature.title }), _jsx("p", { className: "text-muted-foreground leading-relaxed", children: feature.description })] })] }, index));
                            }) })] }) }), _jsx("section", { id: "how-it-works", className: "bg-muted/30 border-y border-border/50 py-16 sm:py-24", children: _jsx("div", { className: "container mx-auto px-4", children: _jsxs("div", { className: "mx-auto max-w-4xl", children: [_jsxs("div", { className: "mb-16 text-center text-3xl sm:text-4xl font-bold tracking-tight text-foreground", children: [_jsx("h2", { children: "How It Works" }), _jsx("p", { className: "mt-4 text-lg font-normal text-muted-foreground text-center", children: "Three simple steps to your perfect lesson note" })] }), _jsxs("div", { className: "relative grid gap-12 md:grid-cols-3", children: [_jsx("div", { className: "hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] bg-border/60 -z-10" }), [
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
                                    ].map((item, i) => (_jsxs("div", { className: "group relative text-center", children: [_jsx("div", { className: "mb-6 flex justify-center", children: _jsx("div", { className: "flex h-20 w-20 items-center justify-center rounded-2xl bg-background border-2 border-border shadow-md group-hover:border-primary group-hover:shadow-primary/20 transition-all duration-300", children: _jsx("span", { className: "bg-gradient-to-br from-primary to-secondary bg-clip-text text-3xl font-bold text-transparent", children: item.step }) }) }), _jsx("h3", { className: "mb-3 text-xl font-bold text-foreground", children: item.title }), _jsx("p", { className: "text-muted-foreground leading-relaxed px-4", children: item.description })] }, item.step)))] })] }) }) }), _jsx("section", { className: "container mx-auto px-4 py-20 sm:py-32", children: _jsxs(Card, { className: "relative overflow-hidden border-0 bg-primary p-8 sm:p-12 lg:p-16 text-center shadow-2xl", children: [_jsx("div", { className: "absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px]" }), _jsxs("div", { className: "relative z-10 mx-auto max-w-3xl flex flex-col items-center", children: [_jsx(Zap, { className: "h-12 w-12 text-primary-foreground mb-6 inline-block opacity-80" }), _jsx("h2", { className: "mb-6 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-primary-foreground", children: "Ready to Transform Your Lesson Planning?" }), _jsx("p", { className: "mb-10 text-lg sm:text-xl text-primary-foreground/90 leading-relaxed font-medium", children: "Join hundreds of educators across Ghana saving valuable time with AI-powered, meticulously aligned lesson notes." }), _jsx(Button, { onClick: () => navigate("/generator"), size: "lg", variant: "secondary", className: "h-14 px-8 text-lg font-bold shadow-xl hover:scale-105 transition-transform duration-300 w-full sm:w-auto text-primary", children: "Get Started Now \u2014 It's Fast" })] })] }) }), _jsx("footer", { className: "border-t border-border/40 bg-background/50 backdrop-blur-md py-10 mt-auto", children: _jsx("div", { className: "container mx-auto px-4", children: _jsxs("div", { className: "flex flex-col md:flex-row justify-between items-center gap-6", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "h-5 w-5 text-primary" }), _jsx("span", { className: "text-lg font-bold", children: "LessonAI" })] }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["\u00A9 ", new Date().getFullYear(), " LessonAI. All rights reserved."] }), _jsx("div", { className: "flex gap-4", children: _jsx("button", { onClick: () => navigate("/admin"), className: "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded-md hover:bg-muted", children: "Admin Portal" }) })] }) }) })] }));
};
export default Index;
