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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          job_id: string | null
          kind: string
          lead_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          job_id?: string | null
          kind: string
          lead_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_slots: {
        Row: {
          arrival_window: string | null
          created_at: string
          day: string
          id: string
          reason: string | null
        }
        Insert: {
          arrival_window?: string | null
          created_at?: string
          day: string
          id?: string
          reason?: string | null
        }
        Update: {
          arrival_window?: string | null
          created_at?: string
          day?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          basis: string | null
          created_at: string
          id: string
          job_id: string
          paid_at: string | null
          status: string
        }
        Insert: {
          amount?: number
          basis?: string | null
          created_at?: string
          id?: string
          job_id: string
          paid_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          basis?: string | null
          created_at?: string
          id?: string
          job_id?: string
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company: string | null
          created_at: string
          do_not_contact: boolean
          email: string | null
          id: string
          name: string
          next_service_due: string | null
          notes: string | null
          phone: string | null
          phone_digits: string | null
          source: string | null
          sourced_by: string
          stage: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          do_not_contact?: boolean
          email?: string | null
          id?: string
          name: string
          next_service_due?: string | null
          notes?: string | null
          phone?: string | null
          phone_digits?: string | null
          source?: string | null
          sourced_by?: string
          stage?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          do_not_contact?: boolean
          email?: string | null
          id?: string
          name?: string
          next_service_due?: string | null
          notes?: string | null
          phone?: string | null
          phone_digits?: string | null
          source?: string | null
          sourced_by?: string
          stage?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          job_id: string | null
          method: string
          paid_at: string | null
          public_url: string | null
          square_invoice_id: string | null
          square_order_id: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          id?: string
          job_id?: string | null
          method?: string
          paid_at?: string | null
          public_url?: string | null
          square_invoice_id?: string | null
          square_order_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          job_id?: string | null
          method?: string
          paid_at?: string | null
          public_url?: string | null
          square_invoice_id?: string | null
          square_order_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string | null
          arrival_window: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          final_total: number | null
          id: string
          items: Json
          lead_id: string | null
          notes: string | null
          number: number
          photos: string[]
          property_id: string | null
          scheduled_date: string | null
          sourced_by: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          arrival_window?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          final_total?: number | null
          id?: string
          items?: Json
          lead_id?: string | null
          notes?: string | null
          number?: number
          photos?: string[]
          property_id?: string | null
          scheduled_date?: string | null
          sourced_by?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          arrival_window?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          final_total?: number | null
          id?: string
          items?: Json
          lead_id?: string | null
          notes?: string | null
          number?: number
          photos?: string[]
          property_id?: string | null
          scheduled_date?: string | null
          sourced_by?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          customer_id: string | null
          details: Json
          email: string | null
          first_response_at: string | null
          id: string
          name: string | null
          page: string | null
          phone: string | null
          source: string | null
          status: string
          type: string
          visitor_id: string | null
          zip: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          details?: Json
          email?: string | null
          first_response_at?: string | null
          id?: string
          name?: string | null
          page?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          type: string
          visitor_id?: string | null
          zip?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          details?: Json
          email?: string | null
          first_response_at?: string | null
          id?: string
          name?: string | null
          page?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          type?: string
          visitor_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          access_notes: string | null
          address: string | null
          city: string | null
          created_at: string
          customer_id: string
          id: string
          pets: string | null
          zip: string | null
        }
        Insert: {
          access_notes?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          customer_id: string
          id?: string
          pets?: string | null
          zip?: string | null
        }
        Update: {
          access_notes?: string | null
          address?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          pets?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          items: Json
          job_id: string | null
          notes: string | null
          number: number
          sent_at: string | null
          status: string
          subtotal: number
          tax: number
          title: string | null
          token: string
          total: number
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          items?: Json
          job_id?: string | null
          notes?: string | null
          number?: number
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          title?: string | null
          token?: string
          total?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          items?: Json
          job_id?: string | null
          notes?: string | null
          number?: number
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          title?: string | null
          token?: string
          total?: number
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      site_events: {
        Row: {
          created_at: string
          event: string
          id: number
          label: string | null
          meta: Json
          path: string | null
          referrer: string | null
          session_id: string | null
          source: string | null
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: number
          label?: string | null
          meta?: Json
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          source?: string | null
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: number
          label?: string | null
          meta?: Json
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          source?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          done_at: string | null
          due_at: string | null
          id: string
          lead_id: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          done_at?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_quote: {
        Args: { p_day?: string; p_token: string; p_window?: string }
        Returns: Json
      }
      booked_slots: {
        Args: { p_from: string; p_to: string }
        Returns: {
          arrival_window: string
          day: string
          n: number
        }[]
      }
      claim_team_access: { Args: never; Returns: boolean }
      get_quote: { Args: { p_token: string }; Returns: Json }
      is_team: { Args: { _uid: string }; Returns: boolean }
      site_stats: { Args: { p_from: string; p_to: string }; Returns: Json }
      submit_lead: { Args: { p: Json }; Returns: string }
    }
    Enums: {
      app_role: "owner" | "partner"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "partner"],
    },
  },
} as const
