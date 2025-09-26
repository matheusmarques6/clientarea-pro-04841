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
      admin_audit: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string | null
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
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
      channel_revenue: {
        Row: {
          channel: string
          created_at: string
          currency: string | null
          id: string
          orders_count: number | null
          period_end: string
          period_start: string
          raw: Json | null
          revenue: number
          source: string
          store_id: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          currency?: string | null
          id?: string
          orders_count?: number | null
          period_end: string
          period_start: string
          raw?: Json | null
          revenue?: number
          source: string
          store_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          currency?: string | null
          id?: string
          orders_count?: number | null
          period_end?: string
          period_start?: string
          raw?: Json | null
          revenue?: number
          source?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string | null
          id: string
          legal_name: string | null
          name: string
          status: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          legal_name?: string | null
          name: string
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cron_execution_log: {
        Row: {
          details: Json | null
          executed_at: string
          id: string
          job_name: string
          status: string | null
        }
        Insert: {
          details?: Json | null
          executed_at?: string
          id?: string
          job_name: string
          status?: string | null
        }
        Update: {
          details?: Json | null
          executed_at?: string
          id?: string
          job_name?: string
          status?: string | null
        }
        Relationships: []
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
      dashboard_cache: {
        Row: {
          created_at: string
          email_revenue: number
          id: string
          order_count: number
          period_end: string
          period_start: string
          sms_revenue: number
          store_id: string
          total_order_revenue: number
          whatsapp_revenue: number
        }
        Insert: {
          created_at?: string
          email_revenue?: number
          id?: string
          order_count?: number
          period_end: string
          period_start: string
          sms_revenue?: number
          store_id: string
          total_order_revenue?: number
          whatsapp_revenue?: number
        }
        Update: {
          created_at?: string
          email_revenue?: number
          id?: string
          order_count?: number
          period_end?: string
          period_start?: string
          sms_revenue?: number
          store_id?: string
          total_order_revenue?: number
          whatsapp_revenue?: number
        }
        Relationships: []
      }
      integrations: {
        Row: {
          created_at: string | null
          extra: Json | null
          id: string
          key_public: string | null
          key_secret_encrypted: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          status: Database["public"]["Enums"]["integration_status"] | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          extra?: Json | null
          id?: string
          key_public?: string | null
          key_secret_encrypted?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          status?: Database["public"]["Enums"]["integration_status"] | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          extra?: Json | null
          id?: string
          key_public?: string | null
          key_secret_encrypted?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          status?: Database["public"]["Enums"]["integration_status"] | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string | null
          id: string
          role: Database["public"]["Enums"]["role_type"] | null
          status: string | null
          store_id: string | null
          token: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["role_type"] | null
          status?: string | null
          store_id?: string | null
          token?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["role_type"] | null
          status?: string | null
          store_id?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      klaviyo_summaries: {
        Row: {
          campaign_count: number | null
          campaigns_with_revenue: number | null
          conversions_campaigns: number | null
          conversions_flows: number | null
          created_at: string
          flow_count: number | null
          flow_perf: Json | null
          flows_with_activity: number | null
          flows_with_revenue: number | null
          id: string
          leads_total: number
          orders_attributed: number
          period_end: string
          period_start: string
          raw: Json | null
          revenue_campaigns: number
          revenue_flows: number
          revenue_total: number
          store_id: string
          top_campaigns_by_conversions: Json | null
          top_campaigns_by_revenue: Json | null
          updated_at: string | null
        }
        Insert: {
          campaign_count?: number | null
          campaigns_with_revenue?: number | null
          conversions_campaigns?: number | null
          conversions_flows?: number | null
          created_at?: string
          flow_count?: number | null
          flow_perf?: Json | null
          flows_with_activity?: number | null
          flows_with_revenue?: number | null
          id?: string
          leads_total?: number
          orders_attributed?: number
          period_end: string
          period_start: string
          raw?: Json | null
          revenue_campaigns?: number
          revenue_flows?: number
          revenue_total?: number
          store_id: string
          top_campaigns_by_conversions?: Json | null
          top_campaigns_by_revenue?: Json | null
          updated_at?: string | null
        }
        Update: {
          campaign_count?: number | null
          campaigns_with_revenue?: number | null
          conversions_campaigns?: number | null
          conversions_flows?: number | null
          created_at?: string
          flow_count?: number | null
          flow_perf?: Json | null
          flows_with_activity?: number | null
          flows_with_revenue?: number | null
          id?: string
          leads_total?: number
          orders_attributed?: number
          period_end?: string
          period_start?: string
          raw?: Json | null
          revenue_campaigns?: number
          revenue_flows?: number
          revenue_total?: number
          store_id?: string
          top_campaigns_by_conversions?: Json | null
          top_campaigns_by_revenue?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      n8n_jobs: {
        Row: {
          created_at: string | null
          created_by: string
          error: string | null
          finished_at: string | null
          id: string
          meta: Json | null
          payload: Json | null
          period_end: string
          period_start: string
          request_id: string
          source: string
          started_at: string | null
          status: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          error?: string | null
          finished_at?: string | null
          id?: string
          meta?: Json | null
          payload?: Json | null
          period_end: string
          period_start: string
          request_id: string
          source?: string
          started_at?: string | null
          status: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          meta?: Json | null
          payload?: Json | null
          period_end?: string
          period_start?: string
          request_id?: string
          source?: string
          started_at?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "n8n_jobs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          channel_attrib:
            | Database["public"]["Enums"]["channel_attribution"]
            | null
          code: string
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_id_ext: number | null
          id: string
          raw: Json | null
          shopify_id: number | null
          status: string | null
          store_id: string | null
          total: number
        }
        Insert: {
          channel_attrib?:
            | Database["public"]["Enums"]["channel_attribution"]
            | null
          code: string
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_id_ext?: number | null
          id?: string
          raw?: Json | null
          shopify_id?: number | null
          status?: string | null
          store_id?: string | null
          total?: number
        }
        Update: {
          channel_attrib?:
            | Database["public"]["Enums"]["channel_attribution"]
            | null
          code?: string
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_id_ext?: number | null
          id?: string
          raw?: Json | null
          shopify_id?: number | null
          status?: string | null
          store_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
      products: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          product_id_ext: string | null
          store_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          product_id_ext?: string | null
          store_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          product_id_ext?: string | null
          store_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
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
      refund_events: {
        Row: {
          created_at: string | null
          from_status: Database["public"]["Enums"]["refund_status"] | null
          id: string
          reason: string | null
          refund_id: string | null
          to_status: Database["public"]["Enums"]["refund_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["refund_status"] | null
          id?: string
          reason?: string | null
          refund_id?: string | null
          to_status: Database["public"]["Enums"]["refund_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["refund_status"] | null
          id?: string
          reason?: string | null
          refund_id?: string | null
          to_status?: Database["public"]["Enums"]["refund_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_events_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          method: string
          refund_id: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          method: string
          refund_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          method?: string
          refund_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_payments_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
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
      return_events: {
        Row: {
          created_at: string | null
          from_status: Database["public"]["Enums"]["return_status"] | null
          id: string
          reason: string | null
          return_id: string | null
          to_status: Database["public"]["Enums"]["return_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["return_status"] | null
          id?: string
          reason?: string | null
          return_id?: string | null
          to_status: Database["public"]["Enums"]["return_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["return_status"] | null
          id?: string
          reason?: string | null
          return_id?: string | null
          to_status?: Database["public"]["Enums"]["return_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_events_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
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
      return_labels: {
        Row: {
          code: string
          created_at: string | null
          id: string
          provider: string
          return_id: string | null
          url: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          provider?: string
          return_id?: string | null
          url?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          provider?: string
          return_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_labels_return_id_fkey"
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
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
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
          client_id: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          id: string
          klaviyo_private_key: string | null
          klaviyo_site_id: string | null
          name: string
          shopify_access_token: string | null
          shopify_domain: string | null
          status: string | null
        }
        Insert: {
          client_id?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          klaviyo_private_key?: string | null
          klaviyo_site_id?: string | null
          name: string
          shopify_access_token?: string | null
          shopify_domain?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          id?: string
          klaviyo_private_key?: string | null
          klaviyo_site_id?: string | null
          name?: string
          shopify_access_token?: string | null
          shopify_domain?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          message: string | null
          provider: string
          records_processed: number | null
          started_at: string
          status: string
          store_id: string
          sync_type: string
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          message?: string | null
          provider: string
          records_processed?: number | null
          started_at: string
          status: string
          store_id: string
          sync_type: string
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          message?: string | null
          provider?: string
          records_processed?: number | null
          started_at?: string
          status?: string
          store_id?: string
          sync_type?: string
        }
        Relationships: []
      }
      user_auth_data: {
        Row: {
          created_at: string | null
          failed_login_attempts: number | null
          last_password_change: string | null
          locked_until: string | null
          password_hash: string | null
          twofa_secret: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          failed_login_attempts?: number | null
          last_password_change?: string | null
          locked_until?: string | null
          password_hash?: string | null
          twofa_secret?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          failed_login_attempts?: number | null
          last_password_change?: string | null
          locked_until?: string | null
          password_hash?: string | null
          twofa_secret?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_auth_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_auth_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_store_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["role_type"] | null
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["role_type"] | null
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["role_type"] | null
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_store_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_store_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_store_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_admin: boolean | null
          last_login_attempt: string | null
          name: string
          role: Database["public"]["Enums"]["role_type"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_admin?: boolean | null
          last_login_attempt?: string | null
          name: string
          role?: Database["public"]["Enums"]["role_type"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_admin?: boolean | null
          last_login_attempt?: string | null
          name?: string
          role?: Database["public"]["Enums"]["role_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      variant_cost_audit: {
        Row: {
          created_at: string | null
          field: string
          id: string
          new_value: number | null
          old_value: number | null
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          field: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          field?: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variant_cost_audit_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_costs: {
        Row: {
          cost_brl: number | null
          cost_eur: number | null
          cost_gbp: number | null
          cost_usd: number | null
          id: string
          updated_at: string | null
          updated_by: string | null
          variant_id: string | null
        }
        Insert: {
          cost_brl?: number | null
          cost_eur?: number | null
          cost_gbp?: number | null
          cost_usd?: number | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          variant_id?: string | null
        }
        Update: {
          cost_brl?: number | null
          cost_eur?: number | null
          cost_gbp?: number | null
          cost_usd?: number | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variant_costs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: true
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          price: number
          product_id: string | null
          sku: string
          title: string
          updated_at: string | null
          variant_id_ext: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          price?: number
          product_id?: string | null
          sku: string
          title: string
          updated_at?: string | null
          variant_id_ext?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          price?: number
          product_id?: string | null
          sku?: string
          title?: string
          updated_at?: string | null
          variant_id_ext?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      users_safe: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          is_admin: boolean | null
          name: string | null
          role: Database["public"]["Enums"]["role_type"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_admin?: boolean | null
          name?: string | null
          role?: Database["public"]["Enums"]["role_type"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_admin?: boolean | null
          name?: string | null
          role?: Database["public"]["Enums"]["role_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      vw_channel_email_summary: {
        Row: {
          currency: string | null
          email_revenue: number | null
          period_end: string | null
          period_start: string | null
          store_id: string | null
        }
        Relationships: []
      }
      vw_store_orders_summary: {
        Row: {
          currency: string | null
          day: string | null
          order_count: number | null
          store_id: string | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_admin_with_audit: {
        Args: { _user_id: string }
        Returns: boolean
      }
      kpi_customers_distinct: {
        Args: { p_end: string; p_start: string; p_store: string }
        Returns: number
      }
      kpi_customers_returning: {
        Args: { p_end: string; p_start: string; p_store: string }
        Returns: number
      }
      kpi_email_orders_count: {
        Args: { p_end: string; p_start: string; p_store: string }
        Returns: number
      }
      kpi_email_revenue: {
        Args: { p_end: string; p_start: string; p_store: string }
        Returns: number
      }
      kpi_total_revenue: {
        Args: { p_end: string; p_start: string; p_store: string }
        Returns: number
      }
      log_security_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_success?: boolean
          p_user_id: string
        }
        Returns: undefined
      }
      reconcile_user_profile: {
        Args: { _auth_id: string; _email: string; _name: string }
        Returns: undefined
      }
      rpc_get_revenue_series: {
        Args: {
          _end_date: string
          _interval?: string
          _start_date: string
          _store_id: string
        }
        Returns: {
          email_revenue: number
          order_count: number
          period: string
          total_revenue: number
        }[]
      }
      rpc_get_store_kpis: {
        Args: { _end_date: string; _start_date: string; _store_id: string }
        Returns: Json
      }
      trigger_auto_sync: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_store_integrations: {
        Args: {
          p_klaviyo_private_key?: string
          p_klaviyo_site_id?: string
          p_shopify_access_token?: string
          p_shopify_domain?: string
          p_store_id: string
        }
        Returns: undefined
      }
      user_has_store_access: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      verify_user_password: {
        Args: { p_email: string; p_password_hash: string }
        Returns: boolean
      }
    }
    Enums: {
      channel_attribution: "email" | "sms" | "whatsapp" | "none"
      integration_provider: "shopify" | "klaviyo" | "sms" | "whatsapp"
      integration_status: "connected" | "error" | "disconnected"
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
      role_type:
        | "owner"
        | "manager"
        | "viewer"
        | "admin"
        | "super_admin"
        | "support"
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
      channel_attribution: ["email", "sms", "whatsapp", "none"],
      integration_provider: ["shopify", "klaviyo", "sms", "whatsapp"],
      integration_status: ["connected", "error", "disconnected"],
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
      role_type: [
        "owner",
        "manager",
        "viewer",
        "admin",
        "super_admin",
        "support",
      ],
    },
  },
} as const
