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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          archived: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          tax_line: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          tax_line?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["account_kind"]
          name?: string
          tax_line?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          token_hash?: string
          token_prefix?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string | null
          ghl_contact_id: string | null
          id: string
          last_synced_at: string | null
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          source: string
          state: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          ghl_contact_id?: string | null
          id?: string
          last_synced_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          source?: string
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          ghl_contact_id?: string | null
          id?: string
          last_synced_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          source?: string
          state?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          address: string
          agent_split_pct: number
          brokerage_split_pct: number
          client_name: string | null
          close_date: string | null
          created_at: string
          gross_commission: number
          id: string
          notes: string | null
          referral_pct: number
          referral_to: string | null
          sale_price: number
          side: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          agent_split_pct?: number
          brokerage_split_pct?: number
          client_name?: string | null
          close_date?: string | null
          created_at?: string
          gross_commission?: number
          id?: string
          notes?: string | null
          referral_pct?: number
          referral_to?: string | null
          sale_price?: number
          side?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          agent_split_pct?: number
          brokerage_split_pct?: number
          client_name?: string | null
          close_date?: string | null
          created_at?: string
          gross_commission?: number
          id?: string
          notes?: string | null
          referral_pct?: number
          referral_to?: string | null
          sale_price?: number
          side?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          last_full_sync_at: string | null
          location_id: string | null
          provider: string
          updated_at: string
          user_id: string
          webhook_secret: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_full_sync_at?: string | null
          location_id?: string | null
          provider: string
          updated_at?: string
          user_id: string
          webhook_secret?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_full_sync_at?: string | null
          location_id?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      integration_sync_log: {
        Row: {
          created_at: string
          direction: string
          entity_id: string | null
          entity_type: string
          error: string | null
          id: string
          payload: Json | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          entity_id?: string | null
          entity_type: string
          error?: string | null
          id?: string
          payload?: Json | null
          provider: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          entity_id?: string | null
          entity_type?: string
          error?: string | null
          id?: string
          payload?: Json | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      mileage_trips: {
        Row: {
          created_at: string
          date: string
          ended_at: string | null
          from_address: string | null
          id: string
          miles: number
          mode: Database["public"]["Enums"]["mileage_mode"]
          purpose: string | null
          started_at: string | null
          to_address: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          ended_at?: string | null
          from_address?: string | null
          id?: string
          miles: number
          mode?: Database["public"]["Enums"]["mileage_mode"]
          purpose?: string | null
          started_at?: string | null
          to_address?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          ended_at?: string | null
          from_address?: string | null
          id?: string
          miles?: number
          mode?: Database["public"]["Enums"]["mileage_mode"]
          purpose?: string | null
          started_at?: string | null
          to_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          created_at: string
          id: string
          image_path: string
          notes: string | null
          raw_ai: Json | null
          receipt_date: string | null
          status: string
          subtotal: number | null
          suggested_category: string | null
          tax: number | null
          total: number | null
          transaction_id: string | null
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_path: string
          notes?: string | null
          raw_ai?: Json | null
          receipt_date?: string | null
          status?: string
          subtotal?: number | null
          suggested_category?: string | null
          tax?: number | null
          total?: number | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string
          notes?: string | null
          raw_ai?: Json | null
          receipt_date?: string | null
          status?: string
          subtotal?: number | null
          suggested_category?: string | null
          tax?: number | null
          total?: number | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string
          date: string
          debit_account_id: string
          id: string
          memo: string
          reference: string | null
          tags: string[] | null
          user_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id: string
          date?: string
          debit_account_id: string
          id?: string
          memo: string
          reference?: string | null
          tags?: string[] | null
          user_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string
          date?: string
          debit_account_id?: string
          id?: string
          memo?: string
          reference?: string | null
          tags?: string[] | null
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      seed_default_accounts: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      account_kind: "Income" | "Expense" | "Asset" | "Liability" | "Equity"
      mileage_mode: "live" | "address" | "manual"
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
      account_kind: ["Income", "Expense", "Asset", "Liability", "Equity"],
      mileage_mode: ["live", "address", "manual"],
    },
  },
} as const
