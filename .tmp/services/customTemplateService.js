import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
export const customTemplateService = {
    /**
     * Upload a custom template file
     */
    async uploadTemplate(file, userId) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
            const filePath = `${userId}/${fileName}`;
            const { error: uploadError } = await supabase.storage
                .from('custom-templates')
                .upload(filePath, file);
            if (uploadError)
                throw uploadError;
            const { data: { publicUrl } } = supabase.storage
                .from('custom-templates')
                .getPublicUrl(filePath);
            return publicUrl;
        }
        catch (error) {
            console.error("Error uploading template:", error);
            toast.error("Failed to upload template file");
            return null;
        }
    },
    /**
     * Create a new custom template record
     */
    async createTemplate(data) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                throw new Error("Not authenticated");
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
            if (error)
                throw error;
            toast.success("Template uploaded successfully!");
            return template;
        }
        catch (error) {
            console.error("Error creating template:", error);
            toast.error("Failed to create template");
            return null;
        }
    },
    /**
     * Get all templates for the current user
     */
    async getUserTemplates() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                return [];
            const { data, error } = await supabase
                .from('custom_templates')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error("Error fetching user templates:", error);
            return [];
        }
    },
    /**
     * Get all public templates
     */
    async getPublicTemplates() {
        try {
            const { data, error } = await supabase
                .from('custom_templates')
                .select('*')
                .eq('is_public', true)
                .order('download_count', { ascending: false });
            if (error)
                throw error;
            return data || [];
        }
        catch (error) {
            console.error("Error fetching public templates:", error);
            return [];
        }
    },
    /**
     * Toggle favorite status
     */
    async toggleFavorite(templateId, isFavorite) {
        try {
            const { error } = await supabase
                .from('custom_templates')
                .update({ is_favorite: isFavorite })
                .eq('id', templateId);
            if (error)
                throw error;
            return true;
        }
        catch (error) {
            console.error("Error toggling favorite:", error);
            toast.error("Failed to update favorite status");
            return false;
        }
    },
    /**
     * Update template details
     */
    async updateTemplate(templateId, updates) {
        try {
            const { error } = await supabase
                .from('custom_templates')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', templateId);
            if (error)
                throw error;
            toast.success("Template updated successfully!");
            return true;
        }
        catch (error) {
            console.error("Error updating template:", error);
            toast.error("Failed to update template");
            return false;
        }
    },
    /**
     * Delete a template
     */
    async deleteTemplate(templateId, fileUrl) {
        try {
            // Extract file path from URL
            const urlParts = fileUrl.split('/custom-templates/');
            if (urlParts.length > 1) {
                const filePath = urlParts[1];
                // Delete file from storage
                const { error: storageError } = await supabase.storage
                    .from('custom-templates')
                    .remove([filePath]);
                if (storageError)
                    console.error("Error deleting file:", storageError);
            }
            // Delete database record
            const { error } = await supabase
                .from('custom_templates')
                .delete()
                .eq('id', templateId);
            if (error)
                throw error;
            toast.success("Template deleted successfully!");
            return true;
        }
        catch (error) {
            console.error("Error deleting template:", error);
            toast.error("Failed to delete template");
            return false;
        }
    },
    /**
     * Increment download count
     */
    async incrementDownloadCount(templateId) {
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
        }
        catch (error) {
            console.error("Error incrementing download count:", error);
        }
    },
    /**
     * Download template file
     */
    async downloadTemplate(fileUrl, fileName) {
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
        }
        catch (error) {
            console.error("Error downloading template:", error);
            toast.error("Failed to download template");
        }
    },
};
