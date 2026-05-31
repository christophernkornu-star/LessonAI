import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Plus, Heart, TrendingUp, BarChart3, Calendar, Award, Clock, } from "lucide-react";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { SimplePieChart } from "@/components/charts/SimplePieChart";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { HeatmapCalendar } from "@/components/charts/HeatmapCalendar";
import { AchievementsDisplay } from "@/components/AchievementsDisplay";
import { InsightsPanel } from "@/components/InsightsPanel";
import * as AnalyticsService from "@/services/analyticsService";
import { generateLessonNoteDocx, generateFileName } from "@/services/docxService";
import { generateGhanaLessonDocx, generateGhanaLessonFileName, parseAIJsonResponse } from "@/services/ghanaLessonDocxService";
import { Navbar } from "@/components/Navbar";
import { DashboardSkeleton } from "@/components/LoadingSkeletons";
const Dashboard = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [lessonNotes, setLessonNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    // Analytics state
    const [lessonsBySubject, setLessonsBySubject] = useState([]);
    const [lessonsByGrade, setLessonsByGrade] = useState([]);
    const [weeklyTrends, setWeeklyTrends] = useState([]);
    const [engagementMetrics, setEngagementMetrics] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [insights, setInsights] = useState([]);
    const [qualityMetrics, setQualityMetrics] = useState(null);
    const [heatmapData, setHeatmapData] = useState([]);
    useEffect(() => {
        let isMounted = true;
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session && isMounted) {
                navigate("/login");
            }
        };
        const init = async () => {
            await checkAuth();
            if (isMounted) {
                await loadDashboardData();
            }
        };
        init();
        return () => {
            isMounted = false;
        };
    }, []);
    const loadDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                return;
            // Load profile and lesson notes in parallel
            const [profileResult, notesResult] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single(),
                supabase
                    .from("lesson_notes")
                    .select("id, title, subject, grade_level, created_at, is_favorite")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false })
            ]);
            const profileData = profileResult.data;
            const notesData = notesResult.data || [];
            if (profileData) {
                setProfile({
                    ...profileData,
                    subjects_taught: (Array.isArray(profileData.subjects_taught) ? profileData.subjects_taught : []),
                    classes_taught: (Array.isArray(profileData.classes_taught) ? profileData.classes_taught : []),
                });
            }
            setLessonNotes(notesData);
            // --- Client-Side Analytics Calculation (Performance Optimization) ---
            // Instead of making 5+ separate API calls that fetch the same data, 
            // we compute metrics from the already fetched lessonNotes.
            // 1. Subjects Distribution (Cleaned & Normalized)
            const subjectMap = {};
            const subjectNormalization = {
                "rme": "Religious and Moral Education",
                "religious and moral education (rme)": "Religious and Moral Education",
                "math": "Mathematics",
                "history of ghana": "History",
                "our world our people": "Our World Our People",
                "creative arts and design": "Creative Arts", // Grouping for cleaner chart
                "computing": "Computing",
                "science": "Science",
                "english": "English Language",
                "english language": "English Language",
                "career technology": "Career Technology",
                "social studies": "Social Studies",
                "ghanian language": "Ghanaian Language"
            };
            notesData.forEach((n) => {
                let s = (n.subject || 'Unknown').trim();
                const lowerS = s.toLowerCase();
                // Normalize common variations
                if (subjectNormalization[lowerS]) {
                    s = subjectNormalization[lowerS];
                }
                else {
                    // Title Case basics
                    s = s.charAt(0).toUpperCase() + s.slice(1);
                }
                subjectMap[s] = (subjectMap[s] || 0) + 1;
            });
            setLessonsBySubject(Object.entries(subjectMap)
                .sort((a, b) => b[1] - a[1]) // Sort highest first for better readability
                .slice(0, 8) // Limit to top 8 to prevent chart crowding
                .map(([name, value]) => ({ name, value })));
            // 2. Grade Distribution
            const gradeMap = {};
            notesData.forEach((n) => {
                const g = n.grade_level || 'Unknown';
                gradeMap[g] = (gradeMap[g] || 0) + 1;
            });
            setLessonsByGrade(Object.entries(gradeMap).map(([name, value]) => ({ name, value })));
            // 3. Weekly Trends (Last 12 Weeks)
            const trendMap = {};
            const now = new Date();
            // Initialize last 12 weeks with 0
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - (i * 7));
                // Find start of that week
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start? Or Sunday?
                // Using simple ISO string slicing for consistency with service
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                const key = weekStart.toISOString().split('T')[0];
                if (!trendMap[key])
                    trendMap[key] = 0;
            }
            notesData.forEach((n) => {
                const d = new Date(n.created_at);
                const diffTime = Math.abs(now.getTime() - d.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 90) { // Approx 12 weeks
                    const weekStart = new Date(d);
                    weekStart.setDate(d.getDate() - d.getDay());
                    const key = weekStart.toISOString().split('T')[0];
                    trendMap[key] = (trendMap[key] || 0) + 1;
                }
            });
            setWeeklyTrends(Object.entries(trendMap)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([week, count]) => ({ week, count })));
            // 4. Engagement Metrics (Calculated properly via AnalyticsService)
            // Removed local simplified calculation to rely on actual data from AnalyticsService below
            // 5. Heatmap
            const dateMap = {};
            notesData.forEach((item) => {
                const date = new Date(item.created_at).toISOString().split('T')[0];
                dateMap[date] = (dateMap[date] || 0) + 1;
            });
            setHeatmapData(Object.entries(dateMap).map(([date, count]) => ({ date, count })));
            // Load heavy external data separately
            const [achievementsData, insightsData, qualityData, engagementData] = await Promise.all([
                AnalyticsService.getUserAchievements(user.id),
                AnalyticsService.getInsights(user.id),
                AnalyticsService.getQualityMetrics(user.id),
                AnalyticsService.getEngagementMetrics(user.id)
            ]);
            setAchievements(achievementsData);
            setInsights(insightsData);
            setEngagementMetrics({
                lessons_this_week: engagementData.lessons_this_week,
                lessons_this_month: engagementData.lessons_this_month,
                last_generated: engagementData.last_generated,
                current_streak: engagementData.current_streak,
                longest_streak: engagementData.longest_streak
            });
            setQualityMetrics({
                total_lessons: qualityData.total_lessons,
                favorites_count: qualityData.favorites_count,
                favorite_rate: qualityData.favorite_rate ? Math.round(qualityData.favorite_rate) : 0,
                avg_content_length: Math.round(qualityData.avg_content_length || 0),
                lessons_with_resources: qualityData.lessons_with_resources || 0
            });
        }
        catch (error) {
            toast({
                title: "Error",
                description: "Failed to load dashboard data",
                variant: "destructive",
            });
        }
        finally {
            setIsLoading(false);
            setLoading(false);
        }
    };
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };
    const toggleFavorite = async (id, currentStatus) => {
        try {
            await supabase
                .from("lesson_notes")
                .update({ is_favorite: !currentStatus })
                .eq("id", id);
            setLessonNotes(lessonNotes.map((note) => note.id === id ? { ...note, is_favorite: !currentStatus } : note));
            toast({
                title: currentStatus ? "Removed from favorites" : "Added to favorites",
            });
        }
        catch (error) {
            toast({
                title: "Error",
                description: "Failed to update favorite status",
                variant: "destructive",
            });
        }
    };
    const downloadLessonNote = async (id) => {
        try {
            const { data } = await supabase
                .from("lesson_notes")
                .select("*")
                .eq("id", id)
                .single();
            if (data && data.generated_content) {
                const content = data.generated_content;
                // Clean content of markdown code blocks if present
                let cleanContent = content.trim();
                if (cleanContent.startsWith('```json')) {
                    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                }
                else if (cleanContent.startsWith('```')) {
                    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                // Check if the content is JSON (Ghana template)
                const isJsonFormat = /^\s*[{[]/.test(cleanContent) || /^```(?:json)?[\s\S]*```$/.test(cleanContent);
                if (isJsonFormat) {
                    try {
                        const parsedResult = parseAIJsonResponse(cleanContent);
                        // Normalize to array for processing metadata
                        const parsedArray = Array.isArray(parsedResult) ? parsedResult : [parsedResult];
                        // Generate filename based on first lesson
                        const filename = generateGhanaLessonFileName(parsedArray[0]);
                        // Generate DOCX
                        await generateGhanaLessonDocx(parsedArray, filename);
                        toast({
                            title: "Success",
                            description: "Lesson note downloaded successfully",
                        });
                    }
                    catch (jsonError) {
                        console.error("JSON parsing error:", jsonError);
                        toast({
                            title: "Error",
                            description: "Failed to parse lesson data. Downloading as text instead.",
                            variant: "destructive",
                        });
                        // Fallback to text download
                        downloadAsText(data);
                    }
                }
                else {
                    // Handle regular text-based templates
                    const metadata = {
                        subject: data.subject || "General",
                        level: data.grade_level || "Basic 1",
                        // We might miss strand info here, but we'll do our best
                    };
                    const filename = generateFileName(metadata);
                    await generateLessonNoteDocx(content, metadata, filename);
                    toast({
                        title: "Success",
                        description: "Lesson note downloaded successfully",
                    });
                }
            }
        }
        catch (error) {
            console.error("Download error:", error);
            toast({
                title: "Error",
                description: "Failed to download lesson note",
                variant: "destructive",
            });
        }
    };
    const downloadAsText = (data) => {
        const element = document.createElement("a");
        const file = new Blob([data.generated_content], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = `${data.title.replace(/\s+/g, "-")}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };
    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate("/login");
            }
            else {
                await loadDashboardData();
            }
        };
        checkUser();
    }, []);
    if (loading) {
        return _jsx(DashboardSkeleton, {});
    }
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) {
            return "Good morning";
        }
        else if (hour < 18) {
            return "Good afternoon";
        }
        else {
            return "Good evening";
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-background text-foreground font-sans flex flex-col", children: [_jsx(Navbar, {}), _jsxs("main", { className: "container mx-auto px-4 py-8 sm:py-12 max-w-7xl flex-grow", children: [_jsxs(Card, { className: "relative overflow-hidden border-0 bg-primary p-6 sm:p-10 mb-8 sm:mb-12 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl", children: [_jsx("div", { className: "absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px] pointer-events-none" }), _jsx("div", { className: "absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-white/10 blur-[50px] pointer-events-none" }), _jsxs("div", { className: "relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6", children: [_jsxs("div", { children: [_jsx("div", { className: "mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-md animate-fade-in-up", children: "Welcome Back" }), _jsxs("h2", { className: "text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-2", children: [getGreeting(), ", ", profile?.full_name || "Teacher", "!"] }), _jsx("p", { className: "text-primary-foreground/90 text-lg sm:text-xl font-medium tracking-wide", children: "Ready to create amazing lesson notes?" })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto mt-4 lg:mt-0", children: [_jsxs(Button, { onClick: () => navigate("/generator"), className: "bg-white text-primary hover:bg-white/90 hover:scale-105 transition-transform duration-300 shadow-xl w-full font-bold h-12 px-6", size: "lg", children: [_jsx(Plus, { className: "mr-2 h-5 w-5" }), "New Lesson"] }), _jsxs(Button, { onClick: () => navigate("/scheme"), className: "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105 transition-transform duration-300 shadow-xl w-full font-medium h-12 px-5", size: "lg", children: [_jsx(Calendar, { className: "mr-2 h-5 w-5" }), "Scheme of Learning"] }), _jsxs(Button, { onClick: () => navigate("/timetable"), className: "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105 transition-transform duration-300 shadow-xl w-full font-medium h-12 px-5", size: "lg", children: [_jsx(Clock, { className: "mr-2 h-5 w-5" }), "Timetable"] }), _jsxs(Button, { onClick: () => navigate("/assessments"), className: "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105 transition-transform duration-300 shadow-xl w-full font-medium h-12 px-5", size: "lg", children: [_jsx(FileText, { className: "mr-2 h-5 w-5" }), "Create Assessment"] })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8", children: [_jsx(Card, { className: "p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "p-3 rounded-full bg-primary/10", children: _jsx(FileText, { className: "h-6 w-6 text-primary" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Total Lessons" }), _jsx("p", { className: "text-2xl font-bold", children: qualityMetrics?.total_lessons || 0 })] })] }) }), _jsx(Card, { className: "p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "p-3 rounded-full bg-secondary/10", children: _jsx(Heart, { className: "h-6 w-6 text-secondary" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Favorites" }), _jsx("p", { className: "text-2xl font-bold", children: qualityMetrics?.favorites_count || 0 })] })] }) }), _jsx(Card, { className: "p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "p-3 rounded-full bg-green-500/10", children: _jsx(TrendingUp, { className: "h-6 w-6 text-green-500" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "This Week" }), _jsx("p", { className: "text-2xl font-bold", children: engagementMetrics?.lessons_this_week || 0 })] })] }) }), _jsx(Card, { className: "p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "p-3 rounded-full bg-orange-500/10", children: _jsx(Award, { className: "h-6 w-6 text-orange-500" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-muted-foreground", children: "Streak" }), _jsxs("p", { className: "text-2xl font-bold flex items-center gap-1", children: ["\uD83D\uDD25 ", engagementMetrics?.current_streak || 0] })] })] }) })] }), insights.length > 0 && (_jsx("div", { className: "mb-6 sm:mb-8", children: _jsx(InsightsPanel, { insights: insights, quickActions: [
                                {
                                    label: "Create New Lesson",
                                    action: () => navigate("/generator"),
                                    variant: "default",
                                },
                            ] }) })), _jsxs(Tabs, { defaultValue: "overview", className: "mb-6 sm:mb-8", children: [_jsxs(TabsList, { className: "sticky top-[72px] sm:top-[80px] z-40 inline-flex h-auto w-full grid grid-cols-4 items-center justify-center gap-1 sm:gap-2 rounded-2xl bg-muted/90 p-1.5 sm:p-2 text-muted-foreground md:flex md:flex-nowrap lg:w-auto border border-border/50 backdrop-blur-xl shadow-sm", children: [_jsxs(TabsTrigger, { value: "overview", className: "flex flex-col sm:flex-row h-auto w-full py-2 px-1 sm:py-2.5 sm:px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all", children: [_jsx(BarChart3, { className: "h-5 w-5 sm:h-4 sm:w-4 sm:mr-2 mb-1 sm:mb-0" }), _jsx("span", { className: "text-[10px] sm:text-sm font-medium", children: "Overview" })] }), _jsxs(TabsTrigger, { value: "activity", className: "flex flex-col sm:flex-row h-auto w-full py-2 px-1 sm:py-2.5 sm:px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all", children: [_jsx(Calendar, { className: "h-5 w-5 sm:h-4 sm:w-4 sm:mr-2 mb-1 sm:mb-0" }), _jsx("span", { className: "text-[10px] sm:text-sm font-medium", children: "Activity" })] }), _jsxs(TabsTrigger, { value: "achievements", className: "flex flex-col sm:flex-row h-auto w-full py-2 px-1 sm:py-2.5 sm:px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all", children: [_jsx(Award, { className: "h-5 w-5 sm:h-4 sm:w-4 sm:mr-2 mb-1 sm:mb-0" }), _jsx("span", { className: "text-[10px] sm:text-sm font-medium", children: "Badges" })] }), _jsxs(TabsTrigger, { value: "lessons", className: "flex flex-col sm:flex-row h-auto w-full py-2 px-1 sm:py-2.5 sm:px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all", children: [_jsx(FileText, { className: "h-5 w-5 sm:h-4 sm:w-4 sm:mr-2 mb-1 sm:mb-0" }), _jsx("span", { className: "text-[10px] sm:text-sm font-medium", children: "Lessons" })] })] }), _jsxs(TabsContent, { value: "overview", className: "mt-6 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [lessonsBySubject.length > 0 && (_jsx(SimplePieChart, { title: "Lessons by Subject", description: "Distribution across subjects", data: lessonsBySubject })), lessonsByGrade.length > 0 && (_jsx(SimpleBarChart, { title: "Lessons by Grade Level", description: "Coverage across grade levels", data: lessonsByGrade, color: "#10b981" }))] }), weeklyTrends.length > 0 && (_jsx(TrendLineChart, { title: "Weekly Lesson Creation Trends", description: "Your lesson creation activity over the last 12 weeks", data: weeklyTrends, xAxisKey: "week", yAxisKey: "count", color: "#8b5cf6" })), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsxs(Card, { className: "p-5 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-accent/5", children: [_jsxs("div", { className: "flex items-center text-sm text-muted-foreground mb-2", children: [_jsx(Heart, { className: "h-4 w-4 mr-2 text-rose-500" }), "Favorite Rate"] }), _jsxs("div", { className: "text-2xl font-bold", children: [qualityMetrics?.favorite_rate || 0, "%"] })] }), _jsxs(Card, { className: "p-5 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-accent/5", children: [_jsxs("div", { className: "flex items-center text-sm text-muted-foreground mb-2", children: [_jsx(FileText, { className: "h-4 w-4 mr-2 text-blue-500" }), "Avg Content Length"] }), _jsx("div", { className: "text-2xl font-bold", children: qualityMetrics?.avg_content_length || 0 })] }), _jsxs(Card, { className: "p-5 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-accent/5", children: [_jsxs("div", { className: "flex items-center text-sm text-muted-foreground mb-2", children: [_jsx(Calendar, { className: "h-4 w-4 mr-2 text-green-500" }), "This Month"] }), _jsx("div", { className: "text-2xl font-bold", children: engagementMetrics?.lessons_this_month || 0 })] }), _jsxs(Card, { className: "p-5 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-accent/5", children: [_jsxs("div", { className: "flex items-center text-sm text-muted-foreground mb-2", children: [_jsx(Award, { className: "h-4 w-4 mr-2 text-yellow-500" }), "Longest Streak"] }), _jsx("div", { className: "text-2xl font-bold", children: engagementMetrics?.longest_streak || 0 })] })] })] }), _jsxs(TabsContent, { value: "activity", className: "mt-6 space-y-6", children: [_jsx(HeatmapCalendar, { title: "Lesson Creation Activity", description: "Your daily lesson generation over the last 12 weeks", data: heatmapData }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs(Card, { className: "p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Engagement Stats" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-muted-foreground", children: "Last Generated" }), _jsx("span", { className: "font-medium", children: engagementMetrics?.last_generated
                                                                            ? new Date(engagementMetrics.last_generated).toLocaleDateString()
                                                                            : 'Never' })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-muted-foreground", children: "Most Active Day" }), _jsx("span", { className: "font-medium", children: engagementMetrics?.most_active_day || 'N/A' })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-muted-foreground", children: "Peak Hour" }), _jsx("span", { className: "font-medium", children: engagementMetrics?.most_active_hour
                                                                            ? `${engagementMetrics.most_active_hour}:00`
                                                                            : 'N/A' })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-muted-foreground", children: "Current Streak" }), _jsxs("span", { className: "font-medium", children: ["\uD83D\uDD25 ", engagementMetrics?.current_streak || 0, " days"] })] })] })] }), _jsxs(Card, { className: "p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5", children: [_jsx("h3", { className: "text-lg font-semibold mb-4", children: "Quality Metrics" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-muted-foreground", children: "Total Lessons" }), _jsx("span", { className: "font-medium", children: qualityMetrics?.total_lessons || 0 })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-muted-foreground", children: "Favorites" }), _jsx("span", { className: "font-medium", children: qualityMetrics?.favorites_count || 0 })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-muted-foreground", children: "Favorite Rate" }), _jsxs("span", { className: "font-medium", children: [qualityMetrics?.favorite_rate || 0, "%"] })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-muted-foreground", children: "With Resources" }), _jsx("span", { className: "font-medium", children: qualityMetrics?.lessons_with_resources || 0 })] })] })] })] })] }), _jsx(TabsContent, { value: "achievements", className: "mt-6", children: _jsx(AchievementsDisplay, { achievements: achievements }) }), _jsx(TabsContent, { value: "lessons", className: "mt-6", children: _jsx(Card, { className: "p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5", children: _jsxs(Tabs, { defaultValue: "all", children: [_jsxs(TabsList, { className: "inline-flex h-12 items-center justify-center rounded-xl bg-muted/40 p-1 text-muted-foreground w-full max-w-md mx-auto mb-6", children: [_jsx(TabsTrigger, { value: "all", className: "h-full px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm", children: "All Lessons" }), _jsx(TabsTrigger, { value: "favorites", className: "h-full px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm", children: "Favorites" }), _jsx(TabsTrigger, { value: "profile", className: "h-full px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm", children: "Profile" })] }), _jsx(TabsContent, { value: "all", className: "mt-6", children: lessonNotes.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(FileText, { className: "h-12 w-12 text-muted-foreground mx-auto mb-4" }), _jsx("p", { className: "text-muted-foreground mb-4", children: "No lesson notes yet. Create your first one!" }), _jsxs(Button, { onClick: () => navigate("/generator"), children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "Create Lesson Note"] })] })) : (_jsx("div", { className: "space-y-4", children: lessonNotes.map((note) => (_jsx(Card, { className: "p-5 sm:p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 hover:bg-accent/5 transition-all duration-300 shadow-sm hover:-translate-y-1 hover:shadow-md", children: _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-6", children: [_jsxs("div", { className: "flex-1 min-w-0 pr-4", children: [_jsx("h3", { className: "font-semibold text-lg sm:text-xl mb-2 text-foreground/90", children: note.title }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-3", children: [_jsx(Badge, { variant: "secondary", className: "text-xs font-medium px-2.5 py-0.5", children: note.subject }), _jsx(Badge, { variant: "outline", className: "text-xs font-medium px-2.5 py-0.5 bg-background", children: note.grade_level })] }), _jsxs("p", { className: "text-sm text-muted-foreground flex items-center gap-1.5", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-primary/40 block" }), "Created ", new Date(note.created_at).toLocaleDateString()] })] }), _jsxs("div", { className: "flex items-center gap-3 shrink-0 self-end sm:self-center", children: [_jsx(Button, { variant: "ghost", size: "icon", className: "rounded-full hover:bg-red-50/50 hover:text-red-500 transition-colors", onClick: () => toggleFavorite(note.id, note.is_favorite), children: _jsx(Heart, { className: `h-5 w-5 ${note.is_favorite ? "fill-red-500 text-red-500" : ""}` }) }), _jsx(Button, { variant: "outline", size: "icon", onClick: () => downloadLessonNote(note.id), children: _jsx(Download, { className: "h-5 w-5" }) })] })] }) }, note.id))) })) }), _jsx(TabsContent, { value: "favorites", className: "mt-6", children: lessonNotes.filter((n) => n.is_favorite).length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(Heart, { className: "h-12 w-12 text-muted-foreground mx-auto mb-4" }), _jsx("p", { className: "text-muted-foreground", children: "No favorite lessons yet" })] })) : (_jsx("div", { className: "space-y-4", children: lessonNotes
                                                        .filter((note) => note.is_favorite)
                                                        .map((note) => (_jsx(Card, { className: "p-5 sm:p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 hover:bg-accent/5 transition-all duration-300 shadow-sm hover:-translate-y-1 hover:shadow-md", children: _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-6", children: [_jsxs("div", { className: "flex-1 min-w-0 pr-4", children: [_jsx("h3", { className: "font-semibold text-lg sm:text-xl mb-2 text-foreground/90", children: note.title }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 mb-3", children: [_jsx(Badge, { variant: "secondary", className: "text-xs font-medium px-2.5 py-0.5", children: note.subject }), _jsx(Badge, { variant: "outline", className: "text-xs font-medium px-2.5 py-0.5 bg-background", children: note.grade_level })] }), _jsxs("p", { className: "text-sm text-muted-foreground flex items-center gap-1.5", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-primary/40 block" }), "Created ", new Date(note.created_at).toLocaleDateString()] })] }), _jsxs("div", { className: "flex items-center gap-3 shrink-0 self-end sm:self-center", children: [_jsx(Button, { variant: "ghost", size: "icon", className: "rounded-full hover:bg-red-50/50", onClick: () => toggleFavorite(note.id, note.is_favorite), children: _jsx(Heart, { className: "h-5 w-5 fill-red-500 text-red-500" }) }), _jsx(Button, { variant: "outline", size: "icon", onClick: () => downloadLessonNote(note.id), children: _jsx(Download, { className: "h-5 w-5" }) })] })] }) }, note.id))) })) }), _jsx(TabsContent, { value: "profile", className: "mt-6", children: _jsx(Card, { className: "p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx("h3", { className: "text-xl font-semibold", children: "Teacher Profile" }), _jsx(Button, { onClick: () => navigate("/profile/edit"), children: "Edit Profile" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium text-muted-foreground", children: "School Name" }), _jsx("p", { className: "text-lg mt-1", children: profile?.school_name || "Not set" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium text-muted-foreground", children: "Email" }), _jsx("p", { className: "text-lg mt-1", children: profile?.email })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium text-muted-foreground", children: "First Name" }), _jsx("p", { className: "text-lg mt-1", children: profile?.first_name || "Not set" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium text-muted-foreground", children: "Last Name" }), _jsx("p", { className: "text-lg mt-1", children: profile?.last_name || "Not set" })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm font-medium text-muted-foreground", children: "Default Class Size" }), _jsx("p", { className: "text-lg mt-1", children: profile?.default_class_size || "Not set" })] })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-lg font-semibold mb-3", children: "Classes Taught" }), profile?.classes_taught && profile.classes_taught.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-2", children: profile.classes_taught.map((cls, index) => {
                                                                            const size = profile.class_sizes?.[cls];
                                                                            return (_jsxs(Badge, { variant: "secondary", children: [cls, " ", size ? `(${size})` : ''] }, index));
                                                                        }) })) : (_jsx("p", { className: "text-muted-foreground", children: "No classes set" }))] }), _jsxs("div", { children: [_jsx("h4", { className: "text-lg font-semibold mb-3", children: "Subjects Taught" }), profile?.subjects_taught && profile.subjects_taught.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-2", children: profile.subjects_taught.map((subject, index) => (_jsx(Badge, { variant: "secondary", children: subject }, index))) })) : (_jsx("p", { className: "text-muted-foreground", children: "No subjects set" }))] })] }) }) })] }) }) })] })] })] }));
};
export default Dashboard;
