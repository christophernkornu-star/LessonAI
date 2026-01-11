import { supabase } from "@/integrations/supabase/client";

/**
 * Enhanced Analytics Service
 * Provides comprehensive metrics and insights for lesson generation
 */

export interface LessonsBySubject {
  subject: string;
  count: number;
}

export interface LessonsByGradeLevel {
  grade_level: string;
  count: number;
}

export interface LessonsByTemplate {
  template_name: string;
  count: number;
}

export interface LessonsByStrand {
  strand: string;
  count: number;
}

export interface WeeklyTrend {
  week: string;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  count: number;
}

export interface UserActivityData {
  user_id: string;
  email: string;
  full_name: string;
  total_lessons: number;
  lessons_this_month: number;
  last_generated: string;
  subscription_tier: string;
}

export interface CurriculumCoverage {
  subject: string;
  total_strands: number;
  covered_strands: number;
  total_sub_strands: number;
  covered_sub_strands: number;
  coverage_percentage: number;
}

export interface QualityMetrics {
  total_lessons: number;
  favorites_count: number;
  favorite_rate: number;
  avg_content_length: number;
  lessons_with_resources: number;
}

export interface EngagementMetrics {
  last_generated: string | null;
  lessons_this_week: number;
  lessons_this_month: number;
  current_streak: number;
  longest_streak: number;
  most_active_day: string;
  most_active_hour: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  progress?: number;
  target?: number;
}

/**
 * Get lessons breakdown by subject
 */
export const getLessonsBySubject = async (userId?: string): Promise<LessonsBySubject[]> => {
  try {
    let query = supabase
      .from('lesson_notes')
      .select('subject');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate by subject
    const subjectMap: { [key: string]: number } = {};
    data?.forEach((lesson: any) => {
      subjectMap[lesson.subject] = (subjectMap[lesson.subject] || 0) + 1;
    });

    return Object.entries(subjectMap).map(([subject, count]) => ({
      subject,
      count,
    }));
  } catch (error) {
    console.error("Error fetching lessons by subject:", error);
    return [];
  }
};

/**
 * Get lessons breakdown by grade level
 */
export const getLessonsByGradeLevel = async (userId?: string): Promise<LessonsByGradeLevel[]> => {
  try {
    let query = supabase
      .from('lesson_notes')
      .select('grade_level');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate by grade level
    const gradeMap: { [key: string]: number } = {};
    data?.forEach((lesson: any) => {
      gradeMap[lesson.grade_level] = (gradeMap[lesson.grade_level] || 0) + 1;
    });

    // Sort by grade level
    const sortOrder = ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'];
    return Object.entries(gradeMap)
      .map(([grade_level, count]) => ({ grade_level, count }))
      .sort((a, b) => sortOrder.indexOf(a.grade_level) - sortOrder.indexOf(b.grade_level));
  } catch (error) {
    console.error("Error fetching lessons by grade level:", error);
    return [];
  }
};

/**
 * Get lessons breakdown by template
 */
export const getLessonsByTemplate = async (userId?: string): Promise<LessonsByTemplate[]> => {
  try {
    let query = supabase
      .from('lesson_notes')
      .select(`
        template_id,
        templates:template_id (name)
      `);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate by template
    const templateMap: { [key: string]: number } = {};
    data?.forEach((lesson: any) => {
      const templateName = lesson.templates?.name || 'Unknown Template';
      templateMap[templateName] = (templateMap[templateName] || 0) + 1;
    });

    return Object.entries(templateMap)
      .map(([template_name, count]) => ({ template_name, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Error fetching lessons by template:", error);
    return [];
  }
};

/**
 * Get lessons breakdown by strand
 */
export const getLessonsByStrand = async (userId?: string, subject?: string): Promise<LessonsByStrand[]> => {
  try {
    let query = supabase
      .from('lesson_notes')
      .select('strand, subject');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate by strand
    const strandMap: { [key: string]: number } = {};
    data?.forEach((lesson: any) => {
      if (lesson.strand) {
        strandMap[lesson.strand] = (strandMap[lesson.strand] || 0) + 1;
      }
    });

    return Object.entries(strandMap)
      .map(([strand, count]) => ({ strand, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Error fetching lessons by strand:", error);
    return [];
  }
};

/**
 * Get weekly trends for the last 12 weeks
 */
export const getWeeklyTrends = async (userId?: string, weeks: number = 12): Promise<WeeklyTrend[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeks * 7));

    let query = supabase
      .from('lesson_notes')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group by week
    const weekMap: { [key: string]: number } = {};
    data?.forEach((lesson: any) => {
      const date = new Date(lesson.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      weekMap[weekKey] = (weekMap[weekKey] || 0) + 1;
    });

    return Object.entries(weekMap)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));
  } catch (error) {
    console.error("Error fetching weekly trends:", error);
    return [];
  }
};

/**
 * Get monthly trends for the last 12 months
 */
export const getMonthlyTrends = async (userId?: string, months: number = 12): Promise<MonthlyTrend[]> => {
  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    let query = supabase
      .from('lesson_notes')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group by month
    const monthMap: { [key: string]: number } = {};
    data?.forEach((lesson: any) => {
      const date = new Date(lesson.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap[monthKey] = (monthMap[monthKey] || 0) + 1;
    });

    return Object.entries(monthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  } catch (error) {
    console.error("Error fetching monthly trends:", error);
    return [];
  }
};

/**
 * Get quality metrics
 */
export const getQualityMetrics = async (userId?: string): Promise<QualityMetrics> => {
  try {
    let query = supabase
      .from('lesson_notes')
      .select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const total_lessons = data?.length || 0;
    const favorites_count = data?.filter((l: any) => l.is_favorite).length || 0;
    const favorite_rate = total_lessons > 0 ? (favorites_count / total_lessons) * 100 : 0;
    
    const total_content_length = data?.reduce((sum: number, l: any) => 
      sum + (l.generated_content?.length || 0), 0) || 0;
    const avg_content_length = total_lessons > 0 ? total_content_length / total_lessons : 0;
    
    const lessons_with_resources = data?.filter((l: any) => 
      l.exemplars && l.exemplars.trim().length > 0).length || 0;

    return {
      total_lessons,
      favorites_count,
      favorite_rate: Math.round(favorite_rate * 10) / 10,
      avg_content_length: Math.round(avg_content_length),
      lessons_with_resources,
    };
  } catch (error) {
    console.error("Error fetching quality metrics:", error);
    return {
      total_lessons: 0,
      favorites_count: 0,
      favorite_rate: 0,
      avg_content_length: 0,
      lessons_with_resources: 0,
    };
  }
};

/**
 * Get user engagement metrics
 */
export const getEngagementMetrics = async (userId: string): Promise<EngagementMetrics> => {
  try {
    const { data, error } = await supabase
      .from('lesson_notes')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const last_generated = data?.[0]?.created_at || null;
    const lessons_this_week = data?.filter((l: any) => 
      new Date(l.created_at) >= weekAgo).length || 0;
    const lessons_this_month = data?.filter((l: any) => 
      new Date(l.created_at) >= monthAgo).length || 0;

    // Calculate streak
    const { current_streak, longest_streak } = calculateStreaks(data || []);

    // Most active day and hour
    const dayMap: { [key: string]: number } = {};
    const hourMap: { [key: number]: number } = {};
    
    data?.forEach((lesson: any) => {
      const date = new Date(lesson.created_at);
      const day = date.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = date.getHours();
      
      dayMap[day] = (dayMap[day] || 0) + 1;
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    });

    const most_active_day = Object.entries(dayMap)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    const most_active_hour = Object.entries(hourMap)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;

    return {
      last_generated,
      lessons_this_week,
      lessons_this_month,
      current_streak,
      longest_streak,
      most_active_day,
      most_active_hour: parseInt(most_active_hour as any),
    };
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    return {
      last_generated: null,
      lessons_this_week: 0,
      lessons_this_month: 0,
      current_streak: 0,
      longest_streak: 0,
      most_active_day: 'N/A',
      most_active_hour: 0,
    };
  }
};

/**
 * Calculate current and longest streaks
 */
const calculateStreaks = (lessons: any[]): { current_streak: number; longest_streak: number } => {
  if (!lessons || lessons.length === 0) {
    return { current_streak: 0, longest_streak: 0 };
  }

  const dates = lessons
    .map((l: any) => new Date(l.created_at).toDateString())
    .filter((date, index, self) => self.indexOf(date) === index)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let current_streak = 0;
  let longest_streak = 0;
  let temp_streak = 1;

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

  // Check current streak
  if (dates[0] === today || dates[0] === yesterday) {
    current_streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        current_streak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      temp_streak++;
    } else {
      longest_streak = Math.max(longest_streak, temp_streak);
      temp_streak = 1;
    }
  }
  longest_streak = Math.max(longest_streak, temp_streak);

  return { current_streak, longest_streak };
};

/**
 * Get curriculum coverage for a subject
 */
export const getCurriculumCoverage = async (userId: string, subject: string): Promise<CurriculumCoverage> => {
  try {
    // Get all curriculum data for the subject
    const { data: curriculumData, error: currError } = await supabase
      .from('curriculum')
      .select('strand, sub_strand')
      .eq('subject', subject);

    if (currError) throw currError;

    // Get user's lesson coverage
    const { data: lessonData, error: lessonError } = await supabase
      .from('lesson_notes')
      .select('strand, sub_strand')
      .eq('user_id', userId)
      .eq('subject', subject);

    if (lessonError) throw lessonError;

    const uniqueStrands = new Set(curriculumData?.map((c: any) => c.strand));
    const uniqueSubStrands = new Set(curriculumData?.map((c: any) => c.sub_strand));
    
    const coveredStrands = new Set(lessonData?.map((l: any) => l.strand));
    const coveredSubStrands = new Set(lessonData?.map((l: any) => l.sub_strand));

    const total_strands = uniqueStrands.size;
    const covered_strands = coveredStrands.size;
    const total_sub_strands = uniqueSubStrands.size;
    const covered_sub_strands = coveredSubStrands.size;

    const coverage_percentage = total_sub_strands > 0 
      ? (covered_sub_strands / total_sub_strands) * 100 
      : 0;

    return {
      subject,
      total_strands,
      covered_strands,
      total_sub_strands,
      covered_sub_strands,
      coverage_percentage: Math.round(coverage_percentage * 10) / 10,
    };
  } catch (error) {
    console.error("Error fetching curriculum coverage:", error);
    return {
      subject,
      total_strands: 0,
      covered_strands: 0,
      total_sub_strands: 0,
      covered_sub_strands: 0,
      coverage_percentage: 0,
    };
  }
};

/**
 * Get user activity data (Admin)
 */
export const getUserActivityData = async (limit: number = 10): Promise<UserActivityData[]> => {
  try {
    // Note: profiles table usually uses 'id' as the primary key which references auth.users.id
    // We select 'id' and alias it to 'user_id' if needed, or just use 'id'
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, subscription_tier, lessons_generated')
      .order('lessons_generated', { ascending: false })
      .limit(limit);

    if (profileError) throw profileError;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const userActivity = await Promise.all(
      profiles.map(async (profile: any) => {
        // Use profile.id as user_id
        const userId = profile.id;
        
        const { data: recentLessons } = await supabase
          .from('lesson_notes')
          .select('created_at')
          .eq('user_id', userId)
          .gte('created_at', thirtyDaysAgo.toISOString());

        const { data: latestLesson } = await supabase
          .from('lesson_notes')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          user_id: userId,
          email: profile.email || 'N/A',
          full_name: profile.full_name || 'Anonymous',
          total_lessons: profile.lessons_generated || 0,
          lessons_this_month: recentLessons?.length || 0,
          last_generated: latestLesson?.[0]?.created_at || 'Never',
          subscription_tier: profile.subscription_tier || 'free',
        };
      })
    );

    return userActivity;
  } catch (error) {
    console.error("Error fetching user activity data:", error);
    return [];
  }
};

/**
 * Get achievements for a user
 */
export const getUserAchievements = async (userId: string): Promise<Achievement[]> => {
  try {
    const { data: lessons } = await supabase
      .from('lesson_notes')
      .select('*')
      .eq('user_id', userId);

    const totalLessons = lessons?.length || 0;
    const favorites = lessons?.filter((l: any) => l.is_favorite).length || 0;
    const subjects = new Set(lessons?.map((l: any) => l.subject)).size;
    
    const { current_streak } = calculateStreaks(lessons || []);

    const achievements: Achievement[] = [
      {
        id: 'first_lesson',
        title: 'Getting Started',
        description: 'Create your first lesson',
        icon: '🎯',
        earned: totalLessons >= 1,
        progress: Math.min(totalLessons, 1),
        target: 1,
      },
      {
        id: 'ten_lessons',
        title: 'Productive Teacher',
        description: 'Generate 10 lessons',
        icon: '📚',
        earned: totalLessons >= 10,
        progress: Math.min(totalLessons, 10),
        target: 10,
      },
      {
        id: 'fifty_lessons',
        title: 'Master Planner',
        description: 'Create 50 lessons',
        icon: '🏆',
        earned: totalLessons >= 50,
        progress: Math.min(totalLessons, 50),
        target: 50,
      },
      {
        id: 'hundred_lessons',
        title: 'Legend',
        description: 'Reach 100 lessons',
        icon: '👑',
        earned: totalLessons >= 100,
        progress: Math.min(totalLessons, 100),
        target: 100,
      },
      {
        id: 'first_favorite',
        title: 'Quality First',
        description: 'Mark your first favorite',
        icon: '⭐',
        earned: favorites >= 1,
        progress: Math.min(favorites, 1),
        target: 1,
      },
      {
        id: 'multi_subject',
        title: 'Versatile Educator',
        description: 'Create lessons in 3+ subjects',
        icon: '🎨',
        earned: subjects >= 3,
        progress: Math.min(subjects, 3),
        target: 3,
      },
      {
        id: 'week_streak',
        title: 'Consistent Creator',
        description: '7-day streak',
        icon: '🔥',
        earned: current_streak >= 7,
        progress: Math.min(current_streak, 7),
        target: 7,
      },
      {
        id: 'month_streak',
        title: 'Dedication Master',
        description: '30-day streak',
        icon: '💎',
        earned: current_streak >= 30,
        progress: Math.min(current_streak, 30),
        target: 30,
      },
    ];

    return achievements;
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return [];
  }
};

/**
 * Get actionable insights and recommendations
 */
export const getInsights = async (userId: string): Promise<string[]> => {
  try {
    const insights: string[] = [];
    
    const { data: lessons } = await supabase
      .from('lesson_notes')
      .select('*')
      .eq('user_id', userId);

    const totalLessons = lessons?.length || 0;
    
    // Check recent activity
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLessons = lessons?.filter((l: any) => 
      new Date(l.created_at) >= weekAgo).length || 0;

    if (recentLessons === 0 && totalLessons > 0) {
      insights.push("You haven't created any lessons this week. Keep the momentum going!");
    }

    // Check subject distribution
    const subjectMap: { [key: string]: number } = {};
    lessons?.forEach((l: any) => {
      subjectMap[l.subject] = (subjectMap[l.subject] || 0) + 1;
    });

    const subjects = Object.keys(subjectMap);
    if (subjects.length === 1 && totalLessons >= 5) {
      insights.push(`Try creating lessons for other subjects beyond ${subjects[0]}`);
    }

    // Check favorites
    const favorites = lessons?.filter((l: any) => l.is_favorite).length || 0;
    if (totalLessons >= 10 && favorites === 0) {
      insights.push("Mark your best lessons as favorites for quick access");
    }

    // Milestone check
    const milestoneDiff = [10, 25, 50, 100].find(m => m > totalLessons);
    if (milestoneDiff) {
      const remaining = milestoneDiff - totalLessons;
      insights.push(`${remaining} more lesson${remaining > 1 ? 's' : ''} to reach ${milestoneDiff} total!`);
    }

    // Coverage check
    const strands = new Set(lessons?.map((l: any) => l.strand));
    if (strands.size < 3 && totalLessons >= 10) {
      insights.push("Expand your curriculum coverage by creating lessons for different strands");
    }

    return insights;
  } catch (error) {
    console.error("Error generating insights:", error);
    return [];
  }
};
