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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audio_samples: {
        Row: {
          audio_url: string
          cover_url: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean | null
          occasion: string
          sort_order: number | null
          style: string
          title: string
          updated_at: string
        }
        Insert: {
          audio_url: string
          cover_url?: string | null
          created_at?: string
          description: string
          id?: string
          is_active?: boolean | null
          occasion: string
          sort_order?: number | null
          style: string
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean | null
          occasion?: string
          sort_order?: number | null
          style?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          order_id: string | null
          payload: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json | null
          user_id?: string | null
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
          body: string
          created_at: string
          id: string
          is_approved: boolean
          order_id: string
          phonetic_body: string | null
          title: string | null
          version: string
        }
        Insert: {
          approved_at?: string | null
          body: string
          created_at?: string
          id?: string
          is_approved?: boolean
          order_id: string
          phonetic_body?: string | null
          title?: string | null
          version: string
        }
        Update: {
          approved_at?: string | null
          body?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          order_id?: string
          phonetic_body?: string | null
          title?: string | null
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
          amount: number
          approved_lyric_id: string | null
          atmosphere: string | null
          created_at: string
          currency: string
          emotion: string | null
          emotion_intensity: number | null
          final_prompt: string | null
          has_monologue: boolean | null
          id: string
          mandatory_words: string | null
          monologue_position: string | null
          music_structure: string | null
          music_style: string | null
          music_type: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pronunciations: Json | null
          purpose: string | null
          restricted_words: string | null
          rhythm: string | null
          status: Database["public"]["Enums"]["order_status"]
          story: string | null
          style_prompt: string | null
          target: string | null
          tone: string | null
          updated_at: string
          user_id: string
          voice_type: string | null
        }
        Insert: {
          amount?: number
          approved_lyric_id?: string | null
          atmosphere?: string | null
          created_at?: string
          currency?: string
          emotion?: string | null
          emotion_intensity?: number | null
          final_prompt?: string | null
          has_monologue?: boolean | null
          id?: string
          mandatory_words?: string | null
          monologue_position?: string | null
          music_structure?: string | null
          music_style?: string | null
          music_type?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pronunciations?: Json | null
          purpose?: string | null
          restricted_words?: string | null
          rhythm?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          story?: string | null
          style_prompt?: string | null
          target?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
          voice_type?: string | null
        }
        Update: {
          amount?: number
          approved_lyric_id?: string | null
          atmosphere?: string | null
          created_at?: string
          currency?: string
          emotion?: string | null
          emotion_intensity?: number | null
          final_prompt?: string | null
          has_monologue?: boolean | null
          id?: string
          mandatory_words?: string | null
          monologue_position?: string | null
          music_structure?: string | null
          music_style?: string | null
          music_type?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pronunciations?: Json | null
          purpose?: string | null
          restricted_words?: string | null
          rhythm?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          story?: string | null
          style_prompt?: string | null
          target?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
          voice_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_approved_lyric_id_fkey"
            columns: ["approved_lyric_id"]
            isOneToOne: false
            referencedRelation: "lyrics"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price_cents: number
          price_display: string
          price_promo_cents: number | null
          sort_order: number | null
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price_cents: number
          price_display: string
          price_promo_cents?: number | null
          sort_order?: number | null
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price_cents?: number
          price_display?: string
          price_promo_cents?: number | null
          sort_order?: number | null
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string | null
          plan: string | null
          songs_generated: number | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          plan?: string | null
          songs_generated?: number | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          plan?: string | null
          songs_generated?: number | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      tracks: {
        Row: {
          audio_url: string | null
          created_at: string
          error_message: string | null
          id: string
          order_id: string
          status: Database["public"]["Enums"]["track_status"]
          updated_at: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["track_status"]
          updated_at?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["track_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      consent_type: "LGPD" | "YouTube"
      order_status:
        | "DRAFT"
        | "AWAITING_PAYMENT"
        | "PAID"
        | "BRIEFING_COMPLETE"
        | "LYRICS_PENDING"
        | "LYRICS_GENERATED"
        | "LYRICS_APPROVED"
        | "MUSIC_GENERATING"
        | "MUSIC_READY"
        | "COMPLETED"
        | "CANCELLED"
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
      app_role: ["admin", "user"],
      consent_type: ["LGPD", "YouTube"],
      order_status: [
        "DRAFT",
        "AWAITING_PAYMENT",
        "PAID",
        "BRIEFING_COMPLETE",
        "LYRICS_PENDING",
        "LYRICS_GENERATED",
        "LYRICS_APPROVED",
        "MUSIC_GENERATING",
        "MUSIC_READY",
        "COMPLETED",
        "CANCELLED",
      ],
      payment_status: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      track_status: ["QUEUED", "GENERATING", "READY", "FAILED"],
    },
  },
} as const
