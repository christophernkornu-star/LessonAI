import { supabase } from "@/integrations/supabase/client";
import type { LessonData } from "./aiService";

export interface SavedLessonNote {
  id?: string;
  user_id: string;
  template_id?: string;
  title: string;
  curriculum: string;
  subject: string;
  grade_level: string;
  strand: string;
  sub_strand: string;
  content_standard: string;
  exemplars: string;
  generated_content: string;
  is_favorite?: boolean;
}

export class LessonNotesService {
  // Save a generated lesson note
  static async saveLessonNote(
    userId: string,
    lessonData: LessonData,
    generatedContent: string,
    templateId?: string
  ): Promise<SavedLessonNote | null> {
    try {
      const title = `${lessonData.subject} - ${lessonData.strand || "Lesson"}`;
      
      // Validate template_id is a valid UUID
      const isValidUUID = (uuid: string) => {
        const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return regex.test(uuid);
      };

      const validTemplateId = (templateId && isValidUUID(templateId)) ? templateId : null;

      const { data, error } = await supabase
        .from("lesson_notes")
        .insert({
          user_id: userId,
          template_id: validTemplateId,
          title,
          curriculum: lessonData.curriculum || "Ghana NaCCA",
          subject: lessonData.subject,
          grade_level: lessonData.level,
          strand: lessonData.strand,
          sub_strand: lessonData.subStrand,
          content_standard: lessonData.contentStandard,
          exemplars: lessonData.exemplars,
          generated_content: generatedContent,
        })
        .select()
        .single();

      if (error) throw error;

      // Update user's lesson count
      await supabase.rpc("increment_lessons_count", { user_id: userId });

      return data as unknown as SavedLessonNote;
    } catch (error) {
      console.error("Error saving lesson note:", error);
      return null;
    }
  }

  // Get all lesson notes for a user
  static async getUserLessonNotes(userId: string): Promise<SavedLessonNote[]> {
    try {
      const { data, error } = await supabase
        .from("lesson_notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data as unknown as SavedLessonNote[]) || [];
    } catch (error) {
      console.error("Error fetching lesson notes:", error);
      return [];
    }
  }

  // Get a specific lesson note
  static async getLessonNote(id: string): Promise<SavedLessonNote | null> {
    try {
      const { data, error } = await supabase
        .from("lesson_notes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return data as unknown as SavedLessonNote;
    } catch (error) {
      console.error("Error fetching lesson note:", error);
      return null;
    }
  }

  // Toggle favorite status
  static async toggleFavorite(id: string, currentStatus: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("lesson_notes")
        .update({ is_favorite: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      return !currentStatus;
    } catch (error) {
      console.error("Error toggling favorite:", error);
      return currentStatus;
    }
  }

  // Delete a lesson note
  static async deleteLessonNote(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("lesson_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Error deleting lesson note:", error);
      return false;
    }
  }
}
