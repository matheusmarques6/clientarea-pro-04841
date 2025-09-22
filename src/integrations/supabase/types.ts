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
      audit_events: {
        Row: {
          action: string | null
          actor: string | null
          created_at: string | null
          entity: string | null
          entity_id: string | null
          id: number
          meta: Json | null
          store_id: string | null
        }
        Insert: {
          action?: string | null
          actor?: string | null
          created_at?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: number
          meta?: Json | null
          store_id?: string | null
        }
        Update: {
          action?: string | null
          actor?: string | null
          created_at?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: number
          meta?: Json | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      product_costs: {
        Row: {
          cost_brl: number | null
          cost_eur: number | null
          cost_gbp: number | null
          cost_usd: number | null
          id: string
          price: number | null
          product_title: string | null
          sku: string
          store_id: string | null
          updated_at: string | null
          updated_by: string | null
          variant_title: string | null
        }
        Insert: {
          cost_brl?: number | null
          cost_eur?: number | null
          cost_gbp?: number | null
          cost_usd?: number | null
          id?: string
          price?: number | null
          product_title?: string | null
          sku: string
          store_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variant_title?: string | null
        }
        Update: {
          cost_brl?: number | null
          cost_eur?: number | null
          cost_gbp?: number | null
          cost_usd?: number | null
          id?: string
          price?: number | null
          product_title?: string | null
          sku?: string
          store_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      public_links: {
        Row: {
          auto_rules: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          messages: Json | null
          slug: string
          store_id: string | null
          type: string
        }
        Insert: {
          auto_rules?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          messages?: Json | null
          slug: string
          store_id?: string | null
          type: string
        }
        Update: {
          auto_rules?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          messages?: Json | null
          slug?: string
          store_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_links_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          code: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          final_amount: number | null
          id: string
          method: string | null
          order_code: string
          origin: string | null
          reason: string | null
          requested_amount: number
          status: Database["public"]["Enums"]["refund_status"]
          store_id: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          final_amount?: number | null
          id?: string
          method?: string | null
          order_code: string
          origin?: string | null
          reason?: string | null
          requested_amount: number
          status?: Database["public"]["Enums"]["refund_status"]
          store_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          final_amount?: number | null
          id?: string
          method?: string | null
          order_code?: string
          origin?: string | null
          reason?: string | null
          requested_amount?: number
          status?: Database["public"]["Enums"]["refund_status"]
          store_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          id: string
          qty: number | null
          return_id: string | null
          sku: string | null
          title: string | null
          unit_price: number | null
          variant: string | null
        }
        Insert: {
          id?: string
          qty?: number | null
          return_id?: string | null
          sku?: string | null
          title?: string | null
          unit_price?: number | null
          variant?: string | null
        }
        Update: {
          id?: string
          qty?: number | null
          return_id?: string | null
          sku?: string | null
          title?: string | null
          unit_price?: number | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          amount: number | null
          code: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          order_code: string
          origin: string | null
          reason: string | null
          sla_days: number | null
          status: Database["public"]["Enums"]["return_status"]
          store_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_code: string
          origin?: string | null
          reason?: string | null
          sla_days?: number | null
          status?: Database["public"]["Enums"]["return_status"]
          store_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_code?: string
          origin?: string | null
          reason?: string | null
          sla_days?: number | null
          status?: Database["public"]["Enums"]["return_status"]
          store_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string | null
          role: Database["public"]["Enums"]["role_type"]
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["role_type"]
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["role_type"]
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          country: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          id: string
          name: string
          status: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          name: string
          status?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          name?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_user_stores: {
        Row: {
          store_id: string | null
          user_id: string | null
        }
        Insert: {
          store_id?: string | null
          user_id?: string | null
        }
        Update: {
          store_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      refund_status:
        | "requested"
        | "review"
        | "approved"
        | "processing"
        | "done"
        | "rejected"
      return_status:
        | "new"
        | "review"
        | "approved"
        | "awaiting_post"
        | "received_dc"
        | "done"
        | "rejected"
      role_type: "owner" | "manager" | "viewer"
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
      refund_status: [
        "requested",
        "review",
        "approved",
        "processing",
        "done",
        "rejected",
      ],
      return_status: [
        "new",
        "review",
        "approved",
        "awaiting_post",
        "received_dc",
        "done",
        "rejected",
      ],
      role_type: ["owner", "manager", "viewer"],
    },
  },
} as const
