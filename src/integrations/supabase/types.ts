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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      bills: {
        Row: {
          amount: number
          count_in_actual: boolean | null
          counterparty: string
          description: string
          due_date: string
          event_id: string
          id: string
          line_id: string | null
          user_id: string
          vat_exempt: boolean | null
        }
        Insert: {
          amount?: number
          count_in_actual?: boolean | null
          counterparty: string
          description?: string
          due_date: string
          event_id: string
          id: string
          line_id?: string | null
          user_id: string
          vat_exempt?: boolean | null
        }
        Update: {
          amount?: number
          count_in_actual?: boolean | null
          counterparty?: string
          description?: string
          due_date?: string
          event_id?: string
          id?: string
          line_id?: string | null
          user_id?: string
          vat_exempt?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          accent: Json
          as_of: string
          budget_baseline: Json | null
          capacity: number | null
          cash_baseline: Json | null
          comps: number | null
          date: string
          headcount: number | null
          id: string
          input_vat_override: number | null
          locked_at: string | null
          name: string
          planning_rows: Json | null
          stage: string
          user_id: string
          vat_exported: boolean
          vat_filed_date: string | null
          venue: string
        }
        Insert: {
          accent: Json
          as_of: string
          budget_baseline?: Json | null
          capacity?: number | null
          cash_baseline?: Json | null
          comps?: number | null
          date: string
          headcount?: number | null
          id: string
          input_vat_override?: number | null
          locked_at?: string | null
          name: string
          planning_rows?: Json | null
          stage: string
          user_id: string
          vat_exported?: boolean
          vat_filed_date?: string | null
          venue?: string
        }
        Update: {
          accent?: Json
          as_of?: string
          budget_baseline?: Json | null
          capacity?: number | null
          cash_baseline?: Json | null
          comps?: number | null
          date?: string
          headcount?: number | null
          id?: string
          input_vat_override?: number | null
          locked_at?: string | null
          name?: string
          planning_rows?: Json | null
          stage?: string
          user_id?: string
          vat_exported?: boolean
          vat_filed_date?: string | null
          venue?: string
        }
        Relationships: []
      }
      files: {
        Row: {
          amount: number | null
          date: string
          event_id: string
          id: string
          line_id: string | null
          name: string
          storage_path: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          date: string
          event_id: string
          id: string
          line_id?: string | null
          name: string
          storage_path?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number | null
          date?: string
          event_id?: string
          id?: string
          line_id?: string | null
          name?: string
          storage_path?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      lines: {
        Row: {
          actual_amount: number
          budget_amount: number
          detail: string | null
          event_id: string
          id: string
          name: string
          parent_id: string | null
          ref: string | null
          section: string
          sort_order: number
          user_id: string
          vat_exempt: boolean | null
          vat_override: number | null
        }
        Insert: {
          actual_amount?: number
          budget_amount?: number
          detail?: string | null
          event_id: string
          id: string
          name: string
          parent_id?: string | null
          ref?: string | null
          section: string
          sort_order?: number
          user_id: string
          vat_exempt?: boolean | null
          vat_override?: number | null
        }
        Update: {
          actual_amount?: number
          budget_amount?: number
          detail?: string | null
          event_id?: string
          id?: string
          name?: string
          parent_id?: string | null
          ref?: string | null
          section?: string
          sort_order?: number
          user_id?: string
          vat_exempt?: boolean | null
          vat_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lines_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      money_in: {
        Row: {
          amount: number
          count_in_actual: boolean | null
          counterparty: string
          description: string
          due_date: string
          event_id: string
          id: string
          line_id: string | null
          user_id: string
          vat_exempt: boolean | null
        }
        Insert: {
          amount?: number
          count_in_actual?: boolean | null
          counterparty: string
          description?: string
          due_date: string
          event_id: string
          id: string
          line_id?: string | null
          user_id: string
          vat_exempt?: boolean | null
        }
        Update: {
          amount?: number
          count_in_actual?: boolean | null
          counterparty?: string
          description?: string
          due_date?: string
          event_id?: string
          id?: string
          line_id?: string | null
          user_id?: string
          vat_exempt?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "money_in_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          date: string
          id: string
          parent_id: string
          parent_kind: string
          user_id: string
        }
        Insert: {
          amount?: number
          date: string
          id: string
          parent_id: string
          parent_kind: string
          user_id: string
        }
        Update: {
          amount?: number
          date?: string
          id?: string
          parent_id?: string
          parent_kind?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          business: string
          currency: string
          user_id: string
          vat_rate: number
        }
        Insert: {
          business?: string
          currency?: string
          user_id: string
          vat_rate?: number
        }
        Update: {
          business?: string
          currency?: string
          user_id?: string
          vat_rate?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
