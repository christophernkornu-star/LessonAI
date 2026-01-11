import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  is_public: boolean;
  is_favorite: boolean;
  category?: string;
  tags?: string[];
  download_count: number;
  created_at: string;
  updated_at: string;
}

export const customTemplateService = {
  /**
   * Upload a custom template file
   */
  async uploadTemplate(file: File, userId: string): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('custom-templates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('custom-templates')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading template:", error);
      toast.error("Failed to upload template file");
      return null;
    }
  },

  /**
   * Create a new custom template record
   */
  async createTemplate(data: {
    name: string;
    description?: string;
    file_url: string;
    file_name: string;
    file_size?: number;
    category?: string;
    tags?: string[];
    is_public?: boolean;
  }): Promise<CustomTemplate | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: template, error } = await supabase
        .from('custom_templates')
        .insert({
          user_id: user.id,
          ...data,
          is_public: data.is_public || false,
          is_favorite: false,
          download_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Template uploaded successfully!");
      return template;
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
      return null;
    }
  },

  /**
   * Get all templates for the current user
   */
  async getUserTemplates(): Promise<CustomTemplate[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('custom_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching user templates:", error);
      return [];
    }
  },

  /**
   * Get all public templates
   */
  async getPublicTemplates(): Promise<CustomTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('custom_templates')
        .select('*')
        .eq('is_public', true)
        .order('download_count', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching public templates:", error);
      return [];
    }
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(templateId: string, isFavorite: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('custom_templates')
        .update({ is_favorite: isFavorite })
        .eq('id', templateId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorite status");
      return false;
    }
  },

  /**
   * Update template details
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<Pick<CustomTemplate, 'name' | 'description' | 'category' | 'tags' | 'is_public'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('custom_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', templateId);

      if (error) throw error;

      toast.success("Template updated successfully!");
      return true;
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
      return false;
    }
  },

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string, fileUrl: string): Promise<boolean> {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/custom-templates/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Delete file from storage
        const { error: storageError } = await supabase.storage
          .from('custom-templates')
          .remove([filePath]);

        if (storageError) console.error("Error deleting file:", storageError);
      }

      // Delete database record
      const { error } = await supabase
        .from('custom_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success("Template deleted successfully!");
      return true;
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
      return false;
    }
  },

  /**
   * Increment download count
   */
  async incrementDownloadCount(templateId: string): Promise<void> {
    try {
      const { data: template } = await supabase
        .from('custom_templates')
        .select('download_count')
        .eq('id', templateId)
        .single();

      if (template) {
        await supabase
          .from('custom_templates')
          .update({ download_count: (template.download_count || 0) + 1 })
          .eq('id', templateId);
      }
    } catch (error) {
      console.error("Error incrementing download count:", error);
    }
  },

  /**
   * Download template file
   */
  async downloadTemplate(fileUrl: string, fileName: string): Promise<void> {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading template:", error);
      toast.error("Failed to download template");
    }
  },
};
