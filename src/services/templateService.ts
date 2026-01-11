import { lessonTemplates, type LessonTemplate } from "@/data/lessonTemplates";
import { supabase } from "@/integrations/supabase/client";

export class TemplateService {
  // Get all templates (from Supabase + local fallback)
  static async getAllTemplates(): Promise<LessonTemplate[]> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .or("is_public.eq.true,is_system.eq.true");

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description || "",
          curriculum: t.curriculum,
          structure: t.structure,
          sections: Array.isArray(t.sections) ? t.sections : []
        }));
      }
    } catch (error) {
      console.error("Error fetching templates from Supabase:", error);
    }

    // Fallback to local templates
    return lessonTemplates;
  }

  // Get templates synchronously (local only)
  static getAllTemplatesSync(): LessonTemplate[] {
    return lessonTemplates;
  }

  // Get template by ID
  static async getTemplateById(id: string): Promise<LessonTemplate | undefined> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        return {
          id: data.id,
          name: data.name,
          description: data.description || "",
          curriculum: data.curriculum,
          structure: data.structure,
          sections: Array.isArray(data.sections) ? data.sections : []
        };
      }
    } catch (error) {
      console.error("Error fetching template:", error);
    }

    return lessonTemplates.find(template => template.id === id);
  }

  // Get templates by curriculum
  static async getTemplatesByCurriculum(curriculum: string): Promise<LessonTemplate[]> {
    const allTemplates = await this.getAllTemplates();
    return allTemplates.filter(
      template => template.curriculum === "all" || template.curriculum === curriculum
    );
  }

  // Add custom template (user-created)
  static async addCustomTemplate(template: Omit<LessonTemplate, "id">, userId: string): Promise<LessonTemplate | null> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .insert({
          user_id: userId,
          name: template.name,
          description: template.description,
          curriculum: template.curriculum,
          structure: template.structure,
          sections: template.sections,
          is_public: false,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        description: data.description || "",
        curriculum: data.curriculum,
        structure: data.structure,
        sections: Array.isArray(data.sections) ? data.sections : []
      };
    } catch (error) {
      console.error("Error adding custom template:", error);
      return null;
    }
  }

  // Get user's custom templates
  static async getUserTemplates(userId: string): Promise<LessonTemplate[]> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("user_id", userId)
        .eq("is_system", false);

      if (error) throw error;

      if (data) {
        return data.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description || "",
          curriculum: t.curriculum,
          structure: t.structure,
          sections: Array.isArray(t.sections) ? t.sections : []
        }));
      }
    } catch (error) {
      console.error("Error fetching user templates:", error);
    }

    return [];
  }

  // Fallback for components expecting sync method
  static getAllTemplatesIncludingCustom(): LessonTemplate[] {
    return lessonTemplates;
  }
}
