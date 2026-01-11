import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ResourceType = "image" | "video" | "document" | "link" | "activity";

export interface Resource {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  resource_type: ResourceType;
  file_url?: string;
  external_url?: string;
  thumbnail_url?: string;
  tags?: string[];
  subject?: string;
  level?: string;
  is_public: boolean;
  is_featured: boolean;
  download_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export const resourceLibraryService = {
  /**
   * Upload a resource file
   */
  async uploadResourceFile(file: File, userId: string): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading resource:", error);
      toast.error("Failed to upload resource file");
      return null;
    }
  },

  /**
   * Create a new resource
   */
  async createResource(data: {
    title: string;
    description?: string;
    resource_type: ResourceType;
    file_url?: string;
    external_url?: string;
    thumbnail_url?: string;
    tags?: string[];
    subject?: string;
    level?: string;
    is_public?: boolean;
  }): Promise<Resource | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: resource, error } = await supabase
        .from('resource_library')
        .insert({
          user_id: user.id,
          ...data,
          is_public: data.is_public || false,
          is_featured: false,
          download_count: 0,
          view_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Resource added to library!");
      return resource;
    } catch (error) {
      console.error("Error creating resource:", error);
      toast.error("Failed to create resource");
      return null;
    }
  },

  /**
   * Get user's resources
   */
  async getUserResources(filters?: {
    resource_type?: ResourceType;
    subject?: string;
    level?: string;
    tags?: string[];
  }): Promise<Resource[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('resource_library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters?.resource_type) {
        query = query.eq('resource_type', filters.resource_type);
      }
      if (filters?.subject) {
        query = query.eq('subject', filters.subject);
      }
      if (filters?.level) {
        query = query.eq('level', filters.level);
      }
      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching user resources:", error);
      return [];
    }
  },

  /**
   * Get public/featured resources
   */
  async getPublicResources(filters?: {
    resource_type?: ResourceType;
    subject?: string;
    featured?: boolean;
  }): Promise<Resource[]> {
    try {
      let query = supabase
        .from('resource_library')
        .select('*')
        .eq('is_public', true)
        .order('view_count', { ascending: false });

      if (filters?.resource_type) {
        query = query.eq('resource_type', filters.resource_type);
      }
      if (filters?.subject) {
        query = query.eq('subject', filters.subject);
      }
      if (filters?.featured) {
        query = query.eq('is_featured', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching public resources:", error);
      return [];
    }
  },

  /**
   * Search resources
   */
  async searchResources(searchTerm: string): Promise<Resource[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('resource_library')
        .select('*')
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error searching resources:", error);
      return [];
    }
  },

  /**
   * Update resource
   */
  async updateResource(
    id: string,
    updates: Partial<Pick<Resource, 'title' | 'description' | 'tags' | 'subject' | 'level' | 'is_public'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('resource_library')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success("Resource updated successfully!");
      return true;
    } catch (error) {
      console.error("Error updating resource:", error);
      toast.error("Failed to update resource");
      return false;
    }
  },

  /**
   * Delete resource
   */
  async deleteResource(id: string, fileUrl?: string): Promise<boolean> {
    try {
      // Delete file from storage if it exists
      if (fileUrl) {
        const urlParts = fileUrl.split('/resources/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('resources').remove([filePath]);
        }
      }

      // Delete database record
      const { error } = await supabase
        .from('resource_library')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Resource deleted successfully!");
      return true;
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Failed to delete resource");
      return false;
    }
  },

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    try {
      await supabase.rpc('increment_resource_views', { resource_id: id });
    } catch (error) {
      console.error("Error incrementing view count:", error);
    }
  },

  /**
   * Increment download count
   */
  async incrementDownloadCount(id: string): Promise<void> {
    try {
      await supabase.rpc('increment_resource_downloads', { resource_id: id });
    } catch (error) {
      console.error("Error incrementing download count:", error);
    }
  },

  /**
   * Download resource
   */
  async downloadResource(resource: Resource): Promise<void> {
    try {
      await this.incrementDownloadCount(resource.id);

      const url = resource.file_url || resource.external_url;
      if (!url) {
        toast.error("No download URL available");
        return;
      }

      if (resource.external_url) {
        window.open(url, '_blank');
      } else {
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = resource.title;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      }

      toast.success("Resource downloaded!");
    } catch (error) {
      console.error("Error downloading resource:", error);
      toast.error("Failed to download resource");
    }
  },
};
