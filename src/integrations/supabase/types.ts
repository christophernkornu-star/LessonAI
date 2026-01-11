export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          first_name: string | null
          middle_name: string | null
          last_name: string | null
          school_name: string | null
          subjects_taught: string[] | null
          classes_taught: string[] | null
          default_class_size: number | null
          lessons_generated: number
          subscription_tier: string
          avatar_url: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          first_name?: string | null
          middle_name?: string | null
          last_name?: string | null
          school_name?: string | null
          subjects_taught?: string[] | null
          classes_taught?: string[] | null
          default_class_size?: number | null
          lessons_generated?: number
          subscription_tier?: string
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          first_name?: string | null
          middle_name?: string | null
          last_name?: string | null
          school_name?: string | null
          subjects_taught?: string[] | null
          classes_taught?: string[] | null
          default_class_size?: number | null
          lessons_generated?: number
          subscription_tier?: string
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_notes: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          title: string
          curriculum: string
          subject: string
          grade_level: string
          strand: string
          sub_strand: string
          content_standard: string
          exemplars: string
          generated_content: string
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          title: string
          curriculum: string
          subject: string
          grade_level: string
          strand: string
          sub_strand: string
          content_standard: string
          exemplars: string
          generated_content: string
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          title?: string
          curriculum?: string
          subject?: string
          grade_level?: string
          strand?: string
          sub_strand?: string
          content_standard?: string
          exemplars?: string
          generated_content?: string
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      templates: {
        Row: {
          id: string
          user_id: string | null
          name: string
          description: string | null
          curriculum: string
          structure: string
          sections: string[]
          is_public: boolean
          is_system: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          description?: string | null
          curriculum: string
          structure: string
          sections: string[]
          is_public?: boolean
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          description?: string | null
          curriculum?: string
          structure?: string
          sections?: string[]
          is_public?: boolean
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          file_url: string
          file_name: string
          file_size: number | null
          is_public: boolean
          is_favorite: boolean
          category: string | null
          tags: string[] | null
          download_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          file_url: string
          file_name: string
          file_size?: number | null
          is_public?: boolean
          is_favorite?: boolean
          category?: string | null
          tags?: string[] | null
          download_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          file_url?: string
          file_name?: string
          file_size?: number | null
          is_public?: boolean
          is_favorite?: boolean
          category?: string | null
          tags?: string[] | null
          download_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_files: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_path: string
          file_type: 'curriculum' | 'template' | 'resource'
          file_format: 'pdf' | 'doc' | 'docx'
          file_size: number | null
          title: string
          description: string | null
          grade_level: string | null
          subject: string | null
          tags: string[] | null
          is_public: boolean
          download_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_path: string
          file_type: 'curriculum' | 'template' | 'resource'
          file_format: 'pdf' | 'doc' | 'docx'
          file_size?: number | null
          title: string
          description?: string | null
          grade_level?: string | null
          subject?: string | null
          tags?: string[] | null
          is_public?: boolean
          download_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_path?: string
          file_type?: 'curriculum' | 'template' | 'resource'
          file_format?: 'pdf' | 'doc' | 'docx'
          file_size?: number | null
          title?: string
          description?: string | null
          grade_level?: string | null
          subject?: string | null
          tags?: string[] | null
          is_public?: boolean
          download_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      resource_library: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          resource_type: 'image' | 'video' | 'document' | 'link' | 'activity'
          file_url: string | null
          external_url: string | null
          thumbnail_url: string | null
          tags: string[] | null
          subject: string | null
          level: string | null
          is_public: boolean
          is_featured: boolean
          download_count: number
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          resource_type: 'image' | 'video' | 'document' | 'link' | 'activity'
          file_url?: string | null
          external_url?: string | null
          thumbnail_url?: string | null
          tags?: string[] | null
          subject?: string | null
          level?: string | null
          is_public?: boolean
          is_featured?: boolean
          download_count?: number
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          resource_type?: 'image' | 'video' | 'document' | 'link' | 'activity'
          file_url?: string | null
          external_url?: string | null
          thumbnail_url?: string | null
          tags?: string[] | null
          subject?: string | null
          level?: string | null
          is_public?: boolean
          is_featured?: boolean
          download_count?: number
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      curriculum: {
        Row: {
          id: string
          user_id: string
          curriculum_name: string
          grade_level: string
          subject: string
          strand: string | null
          sub_strand: string | null
          content_standards: string[]
          learning_indicators: string[]
          exemplars: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          curriculum_name: string
          grade_level: string
          subject: string
          strand?: string | null
          sub_strand?: string | null
          content_standards: string[]
          learning_indicators: string[]
          exemplars?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          curriculum_name?: string
          grade_level?: string
          subject?: string
          strand?: string | null
          sub_strand?: string | null
          content_standards?: string[]
          learning_indicators?: string[]
          exemplars?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      standards_coverage: {
        Row: {
          id: string
          user_id: string
          subject: string
          level: string
          strand: string
          sub_strand: string | null
          content_standard: string
          lesson_note_id: string | null
          date_taught: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject: string
          level: string
          strand: string
          sub_strand?: string | null
          content_standard: string
          lesson_note_id?: string | null
          date_taught: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject?: string
          level?: string
          strand?: string
          sub_strand?: string | null
          content_standard?: string
          lesson_note_id?: string | null
          date_taught?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          id: string
          user_id: string | null
          request_type: string
          model: string
          tokens_used: number
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          request_type: string
          model: string
          tokens_used: number
          success: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          request_type?: string
          model?: string
          tokens_used?: number
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_lessons_count: {
        Args: {
          user_id: string
        }
        Returns: undefined
      }
      admin_insert_resource_file: {
        Args: {
          p_user_id: string
          p_file_name: string
          p_file_path: string
          p_file_type: string
          p_file_format: string
          p_file_size: number
          p_title: string
          p_description: string
          p_grade_level: string
          p_subject: string
          p_tags: string[]
          p_is_public: boolean
        }
        Returns: string
      }
      increment_resource_views: {
        Args: {
          resource_id: string
        }
        Returns: undefined
      }
      increment_resource_downloads: {
        Args: {
          resource_id: string
        }
        Returns: undefined
      }
      log_ai_usage: {
        Args: {
          p_user_id: string
          p_request_type: string
          p_model: string
          p_tokens_used: number
          p_success: boolean
          p_error_message: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
