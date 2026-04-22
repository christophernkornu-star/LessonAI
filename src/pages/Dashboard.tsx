import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Download,
  Plus,
  LogOut,
  Heart,
  TrendingUp,
  BarChart3,
  Target,
  Calendar,
  Award,
  Upload,
  Clock,
} from "lucide-react";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { SimplePieChart } from "@/components/charts/SimplePieChart";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CoverageProgress } from "@/components/charts/CoverageProgress";
import { HeatmapCalendar } from "@/components/charts/HeatmapCalendar";
import { AchievementsDisplay } from "@/components/AchievementsDisplay";
import { InsightsPanel } from "@/components/InsightsPanel";
import * as AnalyticsService from "@/services/analyticsService";
import { generateLessonNoteDocx, generateFileName } from "@/services/docxService";
import { generateGhanaLessonDocx, generateGhanaLessonFileName, parseAIJsonResponse } from "@/services/ghanaLessonDocxService";
import { Navbar } from "@/components/Navbar";
import { DashboardSkeleton } from "@/components/LoadingSkeletons";

interface Profile {
  full_name: string;
  email: string;
  lessons_generated: number;
  subscription_tier: string;
  school_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  subjects_taught?: string[];
  classes_taught?: string[];
  default_class_size?: number;
  class_sizes?: Record<string, number>;
}

interface LessonNote {
  id: string;
  title: string;
  subject: string;
  grade_level: string;
  created_at: string;
  is_favorite: boolean;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Analytics state
  const [lessonsBySubject, setLessonsBySubject] = useState<any[]>([]);
  const [lessonsByGrade, setLessonsByGrade] = useState<any[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([]);
  const [engagementMetrics, setEngagementMetrics] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);

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
      if (!user) return;

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
          subjects_taught: (Array.isArray(profileData.subjects_taught) ? profileData.subjects_taught : []) as string[],
          classes_taught: (Array.isArray(profileData.classes_taught) ? profileData.classes_taught : []) as string[],
        } as unknown as Profile);
      }

      setLessonNotes(notesData);

      // --- Client-Side Analytics Calculation (Performance Optimization) ---
      // Instead of making 5+ separate API calls that fetch the same data, 
      // we compute metrics from the already fetched lessonNotes.
      
      // 1. Subjects Distribution (Cleaned & Normalized)
      const subjectMap: Record<string, number> = {};
      const subjectNormalization: Record<string, string> = {
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

      notesData.forEach((n: any) => {
        let s = (n.subject || 'Unknown').trim();
        const lowerS = s.toLowerCase();
        
        // Normalize common variations
        if (subjectNormalization[lowerS]) {
            s = subjectNormalization[lowerS];
        } else {
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
      const gradeMap: Record<string, number> = {};
      notesData.forEach((n: any) => {
        const g = n.grade_level || 'Unknown';
        gradeMap[g] = (gradeMap[g] || 0) + 1;
      });
      setLessonsByGrade(Object.entries(gradeMap).map(([name, value]) => ({ name, value })));

      // 3. Weekly Trends (Last 12 Weeks)
      const trendMap: Record<string, number> = {};
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
        if (!trendMap[key]) trendMap[key] = 0;
      }

      notesData.forEach((n: any) => {
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


      // 4. Engagement Metrics (Simplified)
      const nowTime = new Date().getTime();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      
      const lessonsThisWeek = notesData.filter((n: any) => (nowTime - new Date(n.created_at).getTime()) < oneWeek).length;
      const lessonsThisMonth = notesData.filter((n: any) => (nowTime - new Date(n.created_at).getTime()) < oneMonth).length;
      
      setEngagementMetrics({
        lessons_this_week: lessonsThisWeek,
        lessons_this_month: lessonsThisMonth,
        last_generated: notesData.length > 0 ? notesData[0].created_at : null,
        current_streak: 0, // Complex to calc, skipping for perf or requires loop
        longest_streak: 0
      });

      // 5. Heatmap
      const dateMap: { [key: string]: number } = {};
      notesData.forEach((item: any) => {
         const date = new Date(item.created_at).toISOString().split('T')[0];
         dateMap[date] = (dateMap[date] || 0) + 1;
      });
      setHeatmapData(Object.entries(dateMap).map(([date, count]) => ({ date, count })));

      // Load heavy external data separately
      const [achievementsData, insightsData] = await Promise.all([
        AnalyticsService.getUserAchievements(user.id),
        AnalyticsService.getInsights(user.id),
      ]);
      
      setAchievements(achievementsData);
      setInsights(insightsData);
      
      // Calculate Quality Metrics locally to fix "Total Lessons: 0"
      const totalLessons = notesData.length;
      const favoritesCount = notesData.filter((n: any) => n.is_favorite).length;
      setQualityMetrics({
        total_lessons: totalLessons,
        favorites_count: favoritesCount,
        favorite_rate: totalLessons > 0 ? Math.round((favoritesCount / totalLessons) * 100) : 0,
        avg_content_length: 0, // Not available in lightweight fetch
        lessons_with_resources: 0 // Not available in lightweight fetch
      });
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    try {
      await supabase
        .from("lesson_notes")
        .update({ is_favorite: !currentStatus })
        .eq("id", id);

      setLessonNotes(
        lessonNotes.map((note) =>
          note.id === id ? { ...note, is_favorite: !currentStatus } : note
        )
      );

      toast({
        title: currentStatus ? "Removed from favorites" : "Added to favorites",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };

  const downloadLessonNote = async (id: string) => {
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
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Check if the content is JSON (Ghana template)
        const isJsonFormat = cleanContent.startsWith('{') || cleanContent.startsWith('[') || cleanContent.includes('---');
        
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
          } catch (jsonError) {
            console.error("JSON parsing error:", jsonError);
            toast({
              title: "Error",
              description: "Failed to parse lesson data. Downloading as text instead.",
              variant: "destructive",
            });
            // Fallback to text download
            downloadAsText(data);
          }
        } else {
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
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "Failed to download lesson note",
        variant: "destructive",
      });
    }
  };

  const downloadAsText = (data: any) => {
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
      } else {
        await loadDashboardData();
      }
    };

    checkUser();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good morning";
    } else if (hour < 18) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <Navbar />

      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-7xl flex-grow">
        {/* Welcome Card */}
        <Card className="relative overflow-hidden border-0 bg-primary p-6 sm:p-10 mb-8 sm:mb-12 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
          <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-white/10 blur-[50px] pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-md animate-fade-in-up">
                Welcome Back
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-2">
                {getGreeting()}, {profile?.full_name || "Teacher"}!
              </h2>
              <p className="text-primary-foreground/90 text-lg sm:text-xl font-medium tracking-wide">Ready to create amazing lesson notes?</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto mt-4 lg:mt-0">
              <Button
                onClick={() => navigate("/generator")}
                className="bg-white text-primary hover:bg-white/90 hover:scale-105 transition-transform duration-300 shadow-xl w-full font-bold h-12 px-6"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                New Lesson
              </Button>
              <Button
                onClick={() => navigate("/scheme")}
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105 transition-transform duration-300 shadow-xl w-full font-medium h-12 px-5"
                size="lg"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Scheme of Learning
              </Button>
              <Button
                onClick={() => navigate("/timetable")}
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105 transition-transform duration-300 shadow-xl w-full font-medium h-12 px-5"
                size="lg"
              >
                <Clock className="mr-2 h-5 w-5" />
                Timetable
              </Button>
              <Button
                onClick={() => navigate("/assessments")}
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:scale-105 transition-transform duration-300 shadow-xl w-full font-medium h-12 px-5"
                size="lg"
              >
                <FileText className="mr-2 h-5 w-5" />
                Create Assessment
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Lessons</p>
                <p className="text-2xl font-bold">{qualityMetrics?.total_lessons || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-secondary/10">
                <Heart className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Favorites</p>
                <p className="text-2xl font-bold">
                  {qualityMetrics?.favorites_count || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {engagementMetrics?.lessons_this_week || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Award className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Streak</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  🔥 {engagementMetrics?.current_streak || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Insights Panel */}
        {insights.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <InsightsPanel 
              insights={insights}
              quickActions={[
                {
                  label: "Create New Lesson",
                  action: () => navigate("/generator"),
                  variant: "default",
                },
              ]}
            />
          </div>
        )}

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="mb-6 sm:mb-8">
          <TabsList className="sticky top-[72px] sm:top-[80px] z-40 inline-flex h-auto w-full grid grid-cols-4 items-center justify-center gap-1 sm:gap-2 rounded-2xl bg-muted/90 p-1.5 sm:p-2 text-muted-foreground md:flex md:flex-nowrap lg:w-auto border border-border/50 backdrop-blur-xl shadow-sm">
            <TabsTrigger value="overview" className="flex flex-col sm:flex-row h-auto w-full py-2 px-1 sm:py-2.5 sm:px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all">
              <BarChart3 className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="text-[10px] sm:text-sm font-medium">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex flex-col sm:flex-row h-auto w-full py-2 px-1 sm:py-2.5 sm:px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all">
              <Calendar className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="text-[10px] sm:text-sm font-medium">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex flex-col sm:flex-row h-auto w-full py-2 px-1 sm:py-2.5 sm:px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all">
              <Award className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="text-[10px] sm:text-sm font-medium">Badges</span>
            </TabsTrigger>
            <TabsTrigger value="lessons" className="flex flex-col sm:flex-row h-auto w-full py-2 px-1 sm:py-2.5 sm:px-4 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all">
              <FileText className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-2 mb-1 sm:mb-0" />
              <span className="text-[10px] sm:text-sm font-medium">Lessons</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {lessonsBySubject.length > 0 && (
                <SimplePieChart
                  title="Lessons by Subject"
                  description="Distribution across subjects"
                  data={lessonsBySubject}
                />
              )}
              {lessonsByGrade.length > 0 && (
                <SimpleBarChart
                  title="Lessons by Grade Level"
                  description="Coverage across grade levels"
                  data={lessonsByGrade}
                  color="#10b981"
                />
              )}
            </div>
            
            {weeklyTrends.length > 0 && (
              <TrendLineChart
                title="Weekly Lesson Creation Trends"
                description="Your lesson creation activity over the last 12 weeks"
                data={weeklyTrends}
                xAxisKey="week"
                yAxisKey="count"
                color="#8b5cf6"
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-accent/5">
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <Heart className="h-4 w-4 mr-2 text-rose-500" />
                  Favorite Rate
                </div>
                <div className="text-2xl font-bold">{qualityMetrics?.favorite_rate || 0}%</div>
              </Card>
              <Card className="p-5 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-accent/5">
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <FileText className="h-4 w-4 mr-2 text-blue-500" />
                  Avg Content Length
                </div>
                <div className="text-2xl font-bold">{qualityMetrics?.avg_content_length || 0}</div>
              </Card>
              <Card className="p-5 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-accent/5">
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4 mr-2 text-green-500" />
                  This Month
                </div>
                <div className="text-2xl font-bold">{engagementMetrics?.lessons_this_month || 0}</div>
              </Card>
              <Card className="p-5 rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:bg-accent/5">
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <Award className="h-4 w-4 mr-2 text-yellow-500" />
                  Longest Streak
                </div>
                <div className="text-2xl font-bold">{engagementMetrics?.longest_streak || 0}</div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6 space-y-6">
            <HeatmapCalendar
              title="Lesson Creation Activity"
              description="Your daily lesson generation over the last 12 weeks"
              data={heatmapData}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
                <h3 className="text-lg font-semibold mb-4">Engagement Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Last Generated</span>
                    <span className="font-medium">
                      {engagementMetrics?.last_generated 
                        ? new Date(engagementMetrics.last_generated).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Most Active Day</span>
                    <span className="font-medium">{engagementMetrics?.most_active_day || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Peak Hour</span>
                    <span className="font-medium">
                      {engagementMetrics?.most_active_hour 
                        ? `${engagementMetrics.most_active_hour}:00`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Current Streak</span>
                    <span className="font-medium">🔥 {engagementMetrics?.current_streak || 0} days</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
                <h3 className="text-lg font-semibold mb-4">Quality Metrics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Lessons</span>
                    <span className="font-medium">{qualityMetrics?.total_lessons || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Favorites</span>
                    <span className="font-medium">{qualityMetrics?.favorites_count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Favorite Rate</span>
                    <span className="font-medium">{qualityMetrics?.favorite_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">With Resources</span>
                    <span className="font-medium">{qualityMetrics?.lessons_with_resources || 0}</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
            <AchievementsDisplay achievements={achievements} />
          </TabsContent>

          <TabsContent value="lessons" className="mt-6">
            <Card className="p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
              <Tabs defaultValue="all">
            <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-muted/40 p-1 text-muted-foreground w-full max-w-md mx-auto mb-6">
                <TabsTrigger value="all" className="h-full px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">All Lessons</TabsTrigger>
                <TabsTrigger value="favorites" className="h-full px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Favorites</TabsTrigger>
                <TabsTrigger value="profile" className="h-full px-6 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Profile</TabsTrigger>
              </TabsList>

            <TabsContent value="all" className="mt-6">
              {lessonNotes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No lesson notes yet. Create your first one!
                  </p>
                  <Button onClick={() => navigate("/generator")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Lesson Note
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {lessonNotes.map((note) => (
                    <Card key={note.id} className="p-4 sm:p-5 group relative overflow-hidden rounded-xl border border-border/50 bg-background/50 hover:bg-accent/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex-1 w-full">
                          <h3 className="font-semibold text-base sm:text-lg mb-1">{note.title}</h3>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">{note.subject}</Badge>
                            <Badge variant="outline" className="text-xs">{note.grade_level}</Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Created {new Date(note.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFavorite(note.id, note.is_favorite)}
                          >
                            <Heart
                              className={`h-5 w-5 ${
                                note.is_favorite ? "fill-red-500 text-red-500" : ""
                              }`}
                            />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => downloadLessonNote(note.id)}
                          >
                            <Download className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="favorites" className="mt-6">
              {lessonNotes.filter((n) => n.is_favorite).length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No favorite lessons yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lessonNotes
                    .filter((note) => note.is_favorite)
                    .map((note) => (
                      <Card key={note.id} className="p-4 sm:p-5 group relative overflow-hidden rounded-xl border border-border/50 bg-background/50 hover:bg-accent/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{note.title}</h3>
                            <div className="flex gap-2 mb-2">
                              <Badge variant="secondary">{note.subject}</Badge>
                              <Badge variant="outline">{note.grade_level}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Created {new Date(note.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleFavorite(note.id, note.is_favorite)}
                            >
                              <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => downloadLessonNote(note.id)}
                            >
                              <Download className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              <Card className="p-6 group relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold">Teacher Profile</h3>
                    <Button onClick={() => navigate("/profile/edit")}>
                      Edit Profile
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">School Name</Label>
                      <p className="text-lg mt-1">{profile?.school_name || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                      <p className="text-lg mt-1">{profile?.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                      <p className="text-lg mt-1">{profile?.first_name || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                      <p className="text-lg mt-1">{profile?.last_name || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Default Class Size</Label>
                      <p className="text-lg mt-1">{profile?.default_class_size || "Not set"}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">Classes Taught</h4>
                    {profile?.classes_taught && profile.classes_taught.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.classes_taught.map((cls, index) => {
                          const size = profile.class_sizes?.[cls];
                          return (
                            <Badge key={index} variant="secondary">
                              {cls} {size ? `(${size})` : ''}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No classes set</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold mb-3">Subjects Taught</h4>
                    {profile?.subjects_taught && profile.subjects_taught.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {profile.subjects_taught.map((subject, index) => (
                          <Badge key={index} variant="secondary">{subject}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No subjects set</p>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </TabsContent>
    </Tabs>
  </main>
</div>
    );
  }
  
  export default Dashboard;
