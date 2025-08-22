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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      consents: {
        Row: {
          accepted_at: string
          id: string
          ip: string | null
          order_id: string | null
          type: Database["public"]["Enums"]["consent_type"]
          user_id: string | null
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip?: string | null
          order_id?: string | null
          type: Database["public"]["Enums"]["consent_type"]
          user_id?: string | null
        }
        Update: {
          accepted_at?: string
          id?: string
          ip?: string | null
          order_id?: string | null
          type?: Database["public"]["Enums"]["consent_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      event_logs: {
        Row: {
          id: string
          order_id: string | null
          payload: Json
          ts: string
          type: string
        }
        Insert: {
          id?: string
          order_id?: string | null
          payload: Json
          ts?: string
          type: string
        }
        Update: {
          id?: string
          order_id?: string | null
          payload?: Json
          ts?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lyrics: {
        Row: {
          approved_at: string | null
          created_at: string
          id: string
          order_id: string | null
          prompt_json: Json
          text: string
          title: string
          version: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          prompt_json: Json
          text: string
          title: string
          version: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          prompt_json?: Json
          text?: string
          title?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "lyrics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          approved_lyric_id: string | null
          created_at: string
          duration_target_sec: number
          id: string
          occasion: string
          payment_provider: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          price_cents: number
          status: Database["public"]["Enums"]["order_status"] | null
          story_raw: string
          story_summary: string | null
          style: string
          tone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_lyric_id?: string | null
          created_at?: string
          duration_target_sec: number
          id?: string
          occasion: string
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          price_cents: number
          status?: Database["public"]["Enums"]["order_status"] | null
          story_raw: string
          story_summary?: string | null
          style: string
          tone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_lyric_id?: string | null
          created_at?: string
          duration_target_sec?: number
          id?: string
          occasion?: string
          payment_provider?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          price_cents?: number
          status?: Database["public"]["Enums"]["order_status"] | null
          story_raw?: string
          story_summary?: string | null
          style?: string
          tone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_approved_lyric"
            columns: ["approved_lyric_id"]
            isOneToOne: false
            referencedRelation: "lyrics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tracks: {
        Row: {
          audio_url: string | null
          cover_url: string | null
          created_at: string
          id: string
          lyric_id: string | null
          order_id: string | null
          rights_plan: string | null
          seed: string | null
          status: Database["public"]["Enums"]["track_status"] | null
          suno_ref: string | null
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          lyric_id?: string | null
          order_id?: string | null
          rights_plan?: string | null
          seed?: string | null
          status?: Database["public"]["Enums"]["track_status"] | null
          suno_ref?: string | null
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          lyric_id?: string | null
          order_id?: string | null
          rights_plan?: string | null
          seed?: string | null
          status?: Database["public"]["Enums"]["track_status"] | null
          suno_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_lyric_id_fkey"
            columns: ["lyric_id"]
            isOneToOne: false
            referencedRelation: "lyrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      consent_type: "LGPD" | "YouTube"
      order_status:
        | "DRAFT"
        | "AWAITING_PAYMENT"
        | "PAID"
        | "LYRICS_DELIVERED"
        | "WAITING_APPROVAL"
        | "APPROVED"
        | "GENERATING_TRACK"
        | "TRACK_READY"
        | "DELIVERED"
      payment_status: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
      track_status: "QUEUED" | "GENERATING" | "READY" | "FAILED"
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
      consent_type: ["LGPD", "YouTube"],
      order_status: [
        "DRAFT",
        "AWAITING_PAYMENT",
        "PAID",
        "LYRICS_DELIVERED",
        "WAITING_APPROVAL",
        "APPROVED",
        "GENERATING_TRACK",
        "TRACK_READY",
        "DELIVERED",
      ],
      payment_status: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      track_status: ["QUEUED", "GENERATING", "READY", "FAILED"],
    },
  },
} as const
