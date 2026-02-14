export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_usage_logs: {
        Row: {
          cost_estimate: number | null
          created_at: string | null
          error_message: string | null
          id: string
          model: string | null
          request_type: string
          success: boolean | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          model?: string | null
          request_type: string
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          model?: string | null
          request_type?: string
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      curriculum: {
        Row: {
          content_standards: Json
          created_at: string
          curriculum_name: string
          exemplars: string | null
          grade_level: string
          id: string
          is_public: boolean | null
          learning_indicators: Json
          strand: string | null
          sub_strand: string | null
          subject: string
          page_reference: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content_standards?: Json
          created_at?: string
          curriculum_name: string
          exemplars?: string | null
          grade_level: string
          id?: string
          is_public?: boolean | null
          learning_indicators?: Json
          strand?: string | null
          sub_strand?: string | null
          subject: string
          page_reference?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content_standards?: Json
          created_at?: string
          curriculum_name?: string
          exemplars?: string | null
          grade_level?: string
          id?: string
          is_public?: boolean | null
          learning_indicators?: Json
          strand?: string | null
          sub_strand?: string | null
          subject?: string
          page_reference?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_files: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_system_wide: boolean | null
          last_used: string | null
          level: string | null
          subject: string | null
          tags: string[] | null
          upload_date: string | null
          use_count: number | null
          user_id: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_system_wide?: boolean | null
          last_used?: string | null
          level?: string | null
          subject?: string | null
          tags?: string[] | null
          upload_date?: string | null
          use_count?: number | null
          user_id?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_system_wide?: boolean | null
          last_used?: string | null
          level?: string | null
          subject?: string | null
          tags?: string[] | null
          upload_date?: string | null
          use_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      custom_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_favorite: boolean | null
          is_public: boolean | null
          name: string
          tags: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          name: string
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_favorite?: boolean | null
          is_public?: boolean | null
          name?: string
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lesson_notes: {
        Row: {
          content_standard: string | null
          created_at: string
          curriculum: string | null
          exemplars: string | null
          generated_content: string
          grade_level: string | null
          id: string
          is_favorite: boolean | null
          strand: string | null
          sub_strand: string | null
          subject: string | null
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_standard?: string | null
          created_at?: string
          curriculum?: string | null
          exemplars?: string | null
          generated_content: string
          grade_level?: string | null
          id?: string
          is_favorite?: boolean | null
          strand?: string | null
          sub_strand?: string | null
          subject?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_standard?: string | null
          created_at?: string
          curriculum?: string | null
          exemplars?: string | null
          generated_content?: string
          grade_level?: string | null
          id?: string
          is_favorite?: boolean | null
          strand?: string | null
          sub_strand?: string | null
          subject?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          classes_taught: Json | null
          created_at: string
          default_class_size: number | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          lessons_generated: number | null
          middle_name: string | null
          role: string | null
          school_name: string | null
          subjects_taught: Json | null
          subscription_tier: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          classes_taught?: Json | null
          created_at?: string
          default_class_size?: number | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          lessons_generated?: number | null
          middle_name?: string | null
          role?: string | null
          school_name?: string | null
          subjects_taught?: Json | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          classes_taught?: Json | null
          created_at?: string
          default_class_size?: number | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          lessons_generated?: number | null
          middle_name?: string | null
          role?: string | null
          school_name?: string | null
          subjects_taught?: Json | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      resource_files: {
        Row: {
          created_at: string
          description: string | null
          download_count: number | null
          file_format: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          grade_level: string | null
          id: string
          is_public: boolean | null
          subject: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_format: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          grade_level?: string | null
          id?: string
          is_public?: boolean | null
          subject?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          download_count?: number | null
          file_format?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          grade_level?: string | null
          id?: string
          is_public?: boolean | null
          subject?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_library: {
        Row: {
          created_at: string | null
          description: string | null
          download_count: number | null
          external_url: string | null
          file_url: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          level: string | null
          resource_type: string
          subject: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          level?: string | null
          resource_type: string
          subject?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          level?: string | null
          resource_type?: string
          subject?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      standards_coverage: {
        Row: {
          content_standard: string
          created_at: string | null
          date_taught: string
          id: string
          lesson_note_id: string | null
          level: string
          notes: string | null
          strand: string
          sub_strand: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_standard: string
          created_at?: string | null
          date_taught: string
          id?: string
          lesson_note_id?: string | null
          level: string
          notes?: string | null
          strand: string
          sub_strand?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_standard?: string
          created_at?: string | null
          date_taught?: string
          id?: string
          lesson_note_id?: string | null
          level?: string
          notes?: string | null
          strand?: string
          sub_strand?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_analytics: {
        Row: {
          id: string
          metadata: Json | null
          metric_name: string
          metric_value: number | null
          recorded_at: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_value?: number | null
          recorded_at?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number | null
          recorded_at?: string | null
        }
        Relationships: []
      }
      template_favorites: {
        Row: {
          created_at: string
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_favorites_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          curriculum: string | null
          description: string | null
          id: string
          is_public: boolean | null
          is_system: boolean | null
          name: string
          sections: Json
          structure: string
          updated_at: string
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          curriculum?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_system?: boolean | null
          name: string
          sections?: Json
          structure: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          curriculum?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_system?: boolean | null
          name?: string
          sections?: Json
          structure?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timetables: {
        Row: {
          class_level: string
          class_size: number | null
          created_at: string
          id: string
          subject_config: Json
          term: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_level: string
          class_size?: number | null
          created_at?: string
          id?: string
          subject_config?: Json
          term: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_level?: string
          class_size?: number | null
          created_at?: string
          id?: string
          subject_config?: Json
          term?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetables_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schemes: {
        Row: {
          id: string
          user_id: string
          week: string | null
          week_ending: string | null
          term: string | null
          subject: string | null
          class_level: string | null
          strand: string | null
          sub_strand: string | null
          content_standard: string | null
          indicators: string | null
          exemplars: string | null
          resources: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week?: string | null
          week_ending?: string | null
          term?: string | null
          subject?: string | null
          class_level?: string | null
          strand?: string | null
          sub_strand?: string | null
          content_standard?: string | null
          indicators?: string | null
          exemplars?: string | null
          resources?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week?: string | null
          week_ending?: string | null
          term?: string | null
          subject?: string | null
          class_level?: string | null
          strand?: string | null
          sub_strand?: string | null
          content_standard?: string | null
          indicators?: string | null
          exemplars?: string | null
          resources?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schemes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          id: string
          token_price_per_1000: number
          platform_fee_percent: number
          minimum_charge: number
          free_daily_tokens: number
          currency: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          token_price_per_1000?: number
          platform_fee_percent?: number
          minimum_charge?: number
          free_daily_tokens?: number
          currency?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          token_price_per_1000?: number
          platform_fee_percent?: number
          minimum_charge?: number
          free_daily_tokens?: number
          currency?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_payment_profiles: {
        Row: {
          id: string
          user_id: string
          wallet_balance: number
          total_spent: number
          total_tokens_used: number
          is_payment_exempt: boolean
          exemption_reason: string | null
          exempted_by: string | null
          exempted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          wallet_balance?: number
          total_spent?: number
          total_tokens_used?: number
          is_payment_exempt?: boolean
          exemption_reason?: string | null
          exempted_by?: string | null
          exempted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          wallet_balance?: number
          total_spent?: number
          total_tokens_used?: number
          is_payment_exempt?: boolean
          exemption_reason?: string | null
          exempted_by?: string | null
          exempted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_payment_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          id: string
          user_id: string
          transaction_type: string
          amount: number
          tokens_amount: number | null
          status: string
          payment_method: string | null
          payment_provider: string | null
          paystack_reference: string | null
          phone_number: string | null
          description: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_type: string
          amount: number
          tokens_amount?: number | null
          status?: string
          payment_method?: string | null
          payment_provider?: string | null
          paystack_reference?: string | null
          phone_number?: string | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transaction_type?: string
          amount?: number
          tokens_amount?: number | null
          status?: string
          payment_method?: string | null
          payment_provider?: string | null
          paystack_reference?: string | null
          phone_number?: string | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      token_usage_log: {
        Row: {
          id: string
          user_id: string
          tokens_used: number
          cost_charged: number
          generation_type: string
          lesson_count: number | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tokens_used: number
          cost_charged: number
          generation_type: string
          lesson_count?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tokens_used?: number
          cost_charged?: number
          generation_type?: string
          lesson_count?: number | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_to_wallet: {
        Args: {
          p_user_id: string
          p_amount: number
        }
        Returns: number
      }
      admin_insert_resource_file: {
        Args: {
          p_description: string
          p_file_format: string
          p_file_name: string
          p_file_path: string
          p_file_size: number
          p_file_type: string
          p_grade_level: string
          p_is_public: boolean
          p_subject: string
          p_tags: string[]
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      increment_lessons_count: { Args: { user_id: string }; Returns: undefined }
      increment_resource_downloads: {
        Args: { resource_id: string }
        Returns: undefined
      }
      increment_resource_views: {
        Args: { resource_id: string }
        Returns: undefined
      }
      log_ai_usage: {
        Args: {
          p_error_message?: string
          p_model: string
          p_request_type: string
          p_success: boolean
          p_tokens_used: number
          p_user_id: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
