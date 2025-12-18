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
      classes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_documents: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          part_id: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          part_id: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          part_id?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_documents_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "exam_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_parts: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          exam_type: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          exam_type: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          exam_type?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      progress_reports: {
        Row: {
          class_id: string | null
          created_at: string
          end_date: string
          id: string
          report_content: string
          start_date: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          end_date: string
          id?: string
          report_content: string
          start_date: string
          student_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          end_date?: string
          id?: string
          report_content?: string
          start_date?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_reports_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_class: {
        Row: {
          class_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_class_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_class: {
        Row: {
          class_id: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          ai_analysis: string | null
          answers: Json
          completed_at: string
          id: string
          percentage: number
          score: number
          test_category: string
          test_id: string
          test_title: string
          total_questions: number
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          answers: Json
          completed_at?: string
          id?: string
          percentage: number
          score: number
          test_category: string
          test_id: string
          test_title: string
          total_questions: number
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          answers?: Json
          completed_at?: string
          id?: string
          percentage?: number
          score?: number
          test_category?: string
          test_id?: string
          test_title?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      test_sessions: {
        Row: {
          completed: boolean
          created_at: string
          expires_at: string
          id: string
          started_at: string
          test_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          started_at?: string
          test_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          started_at?: string
          test_id?: string
          user_id?: string
        }
        Relationships: []
      }
      tests: {
        Row: {
          audio_file_path: string | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          difficulty: string
          duration: number
          id: string
          parts: Json | null
          questions: Json
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_file_path?: string | null
          category: string
          created_at?: string | null
          created_by?: string | null
          description: string
          difficulty: string
          duration: number
          id: string
          parts?: Json | null
          questions: Json
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_file_path?: string | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          difficulty?: string
          duration?: number
          id?: string
          parts?: Json | null
          questions?: Json
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      writing_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: string
          id: string
          prompt: string
          rubric: string
          time_limit: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty: string
          id?: string
          prompt: string
          rubric: string
          time_limit?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          prompt?: string
          rubric?: string
          time_limit?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      writing_submissions: {
        Row: {
          ai_feedback: string | null
          ai_grade: number | null
          content: string
          created_at: string
          id: string
          prompt_id: string
          status: string
          student_id: string
          submitted_at: string
          teacher_grade: number | null
          teacher_notes: string | null
          updated_at: string
          word_count: number
        }
        Insert: {
          ai_feedback?: string | null
          ai_grade?: number | null
          content: string
          created_at?: string
          id?: string
          prompt_id: string
          status?: string
          student_id: string
          submitted_at?: string
          teacher_grade?: number | null
          teacher_notes?: string | null
          updated_at?: string
          word_count?: number
        }
        Update: {
          ai_feedback?: string | null
          ai_grade?: number | null
          content?: string
          created_at?: string
          id?: string
          prompt_id?: string
          status?: string
          student_id?: string
          submitted_at?: string
          teacher_grade?: number | null
          teacher_notes?: string | null
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "writing_submissions_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "writing_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      tests_public: {
        Row: {
          audio_file_path: string | null
          category: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          duration: number | null
          id: string | null
          parts: Json | null
          questions: Json | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          audio_file_path?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          id?: string | null
          parts?: never
          questions?: never
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          audio_file_path?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          id?: string | null
          parts?: never
          questions?: never
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      strip_answers_from_parts: { Args: { parts_data: Json }; Returns: Json }
      strip_answers_from_questions: {
        Args: { questions_data: Json }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "teacher"
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
    Enums: {
      app_role: ["admin", "moderator", "user", "teacher"],
    },
  },
} as const
