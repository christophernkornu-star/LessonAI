import { supabase } from "@/integrations/supabase/client";

export interface SubjectConfig {
  days: string[];
  frequency: number;
}

export interface TimetableData {
  id?: string;
  user_id?: string;
  class_level: string;
  term?: string;
  subject_config: Record<string, SubjectConfig>;
  class_size?: number;
  created_at?: string;
  updated_at?: string;
}

export class TimetableService {
  static async getTimetable(userId: string, classLevel: string, term: string = "First Term"): Promise<TimetableData | null> {
    const { data, error } = await supabase
      .from("timetables")
      .select("*")
      .eq("user_id", userId)
      .eq("class_level", classLevel)
      .eq("term", term)
      .maybeSingle(); // Use maybeSingle to avoid 406 error if not found

    if (error) {
      console.error("Error fetching timetable:", error);
      return null;
    }

    // Explicit cast to avoid type errors with Json types from Supabase
    return data ? {
        ...data,
        subject_config: data.subject_config as unknown as Record<string, SubjectConfig>,
        class_size: data.class_size ?? undefined
    } as TimetableData : null;
  }

  static async saveTimetable(timetable: TimetableData): Promise<TimetableData | null> {
    // Check if exists first to handle upsert correctly with unique constraints if needed, 
    // but standard upsert should work if we have the ID or match on unique columns.
    // Since we have a unique constraint on (user_id, class_level, term), upsert is perfect.

    const { data, error } = await supabase
      .from("timetables")
      .upsert({
        user_id: timetable.user_id!,
        class_level: timetable.class_level,
        term: timetable.term!,
        subject_config: timetable.subject_config as unknown as any, // Cast to any to satisfy Json type
        class_size: timetable.class_size
      }, { onConflict: 'user_id,class_level,term' })
      .select()
      .single();

    if (error) {
      console.error("Error saving timetable:", error);
      throw error;
    }

    return data ? {
        ...data,
        subject_config: data.subject_config as unknown as Record<string, SubjectConfig>,
        class_size: data.class_size ?? undefined
    } as TimetableData : null;
  }
  
  static async getAllTimetables(userId: string): Promise<TimetableData[]> {
      const { data, error } = await supabase
      .from("timetables")
      .select("*")
      .eq("user_id", userId);
      
      if (error) {
          console.error("Error fetching all timetables:", error);
          return [];
      }
      return (data || []).map(item => ({
        ...item,
        subject_config: item.subject_config as unknown as Record<string, SubjectConfig>,
        class_size: item.class_size ?? undefined
      })) as TimetableData[];
  }
}
