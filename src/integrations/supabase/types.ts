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
      audio_inputs: {
        Row: {
          created_at: string
          duration_sec: number | null
          id: string
          mime_type: string
          size_bytes: number | null
          source: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          mime_type: string
          size_bytes?: number | null
          source?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          mime_type?: string
          size_bytes?: number | null
          source?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_samples: {
        Row: {
          audio_type: string
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
          audio_type?: string
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
          audio_type?: string
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
      commemorative_dates: {
        Row: {
          calculation_rule: string | null
          created_at: string | null
          day: number | null
          description: string | null
          description_en: string | null
          description_es: string | null
          description_it: string | null
          emoji: string | null
          id: string
          is_active: boolean | null
          month: number
          name: string
          name_en: string | null
          name_es: string | null
          name_it: string | null
          sort_order: number | null
          suggested_atmosphere: string | null
          suggested_emotion: string | null
          suggested_music_type: string | null
        }
        Insert: {
          calculation_rule?: string | null
          created_at?: string | null
          day?: number | null
          description?: string | null
          description_en?: string | null
          description_es?: string | null
          description_it?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          month: number
          name: string
          name_en?: string | null
          name_es?: string | null
          name_it?: string | null
          sort_order?: number | null
          suggested_atmosphere?: string | null
          suggested_emotion?: string | null
          suggested_music_type?: string | null
        }
        Update: {
          calculation_rule?: string | null
          created_at?: string | null
          day?: number | null
          description?: string | null
          description_en?: string | null
          description_es?: string | null
          description_it?: string | null
          emoji?: string | null
          id?: string
          is_active?: boolean | null
          month?: number
          name?: string
          name_en?: string | null
          name_es?: string | null
          name_it?: string | null
          sort_order?: number | null
          suggested_atmosphere?: string | null
          suggested_emotion?: string | null
          suggested_music_type?: string | null
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
      credit_transfers: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          credit_type: string
          credits_amount: number
          expires_at: string | null
          from_user_id: string
          id: string
          message: string | null
          source_credit_id: string
          status: string
          to_user_email: string
          to_user_id: string | null
          transfer_code: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          credit_type?: string
          credits_amount: number
          expires_at?: string | null
          from_user_id: string
          id?: string
          message?: string | null
          source_credit_id: string
          status?: string
          to_user_email: string
          to_user_id?: string | null
          transfer_code: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          credit_type?: string
          credits_amount?: number
          expires_at?: string | null
          from_user_id?: string
          id?: string
          message?: string | null
          source_credit_id?: string
          status?: string
          to_user_email?: string
          to_user_id?: string | null
          transfer_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transfers_source_credit_id_fkey"
            columns: ["source_credit_id"]
            isOneToOne: false
            referencedRelation: "user_credits"
            referencedColumns: ["id"]
          },
        ]
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
      notification_logs: {
        Row: {
          body: string
          error_message: string | null
          id: string
          order_id: string | null
          sent_at: string
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          body: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          sent_at?: string
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          sent_at?: string
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_order_id_fkey"
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
          cover_url: string | null
          created_at: string
          currency: string
          discount_applied: number | null
          emotion: string | null
          emotion_intensity: number | null
          final_prompt: string | null
          has_custom_lyric: boolean | null
          has_monologue: boolean | null
          id: string
          instrumentation_notes: string | null
          instruments: string[] | null
          is_confidential: boolean | null
          is_instrumental: boolean | null
          is_preview: boolean | null
          mandatory_words: string | null
          monologue_position: string | null
          music_ready_at: string | null
          music_structure: string | null
          music_style: string | null
          music_type: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pix_receipt_url: string | null
          pix_rejection_reason: string | null
          plan_id: string | null
          prompt_validation_score: number | null
          pronunciations: Json | null
          purpose: string | null
          restricted_words: string | null
          review_notification_sent: boolean | null
          rhythm: string | null
          solo_instrument: string | null
          solo_moment: string | null
          song_title: string | null
          status: Database["public"]["Enums"]["order_status"]
          story: string | null
          style_prompt: string | null
          target: string | null
          tone: string | null
          updated_at: string
          user_id: string
          voice_type: string | null
          voucher_code: string | null
        }
        Insert: {
          amount?: number
          approved_lyric_id?: string | null
          atmosphere?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          discount_applied?: number | null
          emotion?: string | null
          emotion_intensity?: number | null
          final_prompt?: string | null
          has_custom_lyric?: boolean | null
          has_monologue?: boolean | null
          id?: string
          instrumentation_notes?: string | null
          instruments?: string[] | null
          is_confidential?: boolean | null
          is_instrumental?: boolean | null
          is_preview?: boolean | null
          mandatory_words?: string | null
          monologue_position?: string | null
          music_ready_at?: string | null
          music_structure?: string | null
          music_style?: string | null
          music_type?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pix_receipt_url?: string | null
          pix_rejection_reason?: string | null
          plan_id?: string | null
          prompt_validation_score?: number | null
          pronunciations?: Json | null
          purpose?: string | null
          restricted_words?: string | null
          review_notification_sent?: boolean | null
          rhythm?: string | null
          solo_instrument?: string | null
          solo_moment?: string | null
          song_title?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          story?: string | null
          style_prompt?: string | null
          target?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
          voice_type?: string | null
          voucher_code?: string | null
        }
        Update: {
          amount?: number
          approved_lyric_id?: string | null
          atmosphere?: string | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          discount_applied?: number | null
          emotion?: string | null
          emotion_intensity?: number | null
          final_prompt?: string | null
          has_custom_lyric?: boolean | null
          has_monologue?: boolean | null
          id?: string
          instrumentation_notes?: string | null
          instruments?: string[] | null
          is_confidential?: boolean | null
          is_instrumental?: boolean | null
          is_preview?: boolean | null
          mandatory_words?: string | null
          monologue_position?: string | null
          music_ready_at?: string | null
          music_structure?: string | null
          music_style?: string | null
          music_type?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pix_receipt_url?: string | null
          pix_rejection_reason?: string | null
          plan_id?: string | null
          prompt_validation_score?: number | null
          pronunciations?: Json | null
          purpose?: string | null
          restricted_words?: string | null
          review_notification_sent?: boolean | null
          rhythm?: string | null
          solo_instrument?: string | null
          solo_moment?: string | null
          song_title?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          story?: string | null
          style_prompt?: string | null
          target?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
          voice_type?: string | null
          voucher_code?: string | null
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
      pix_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          pix_key: string
          pix_name: string
          qr_code_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          pix_key?: string
          pix_name?: string
          qr_code_url?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          pix_key?: string
          pix_name?: string
          qr_code_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_config: {
        Row: {
          created_at: string
          credits: number | null
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
          credits?: number | null
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
          credits?: number | null
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
          avatar_url: string | null
          created_at: string
          id: string
          name: string | null
          phone: string | null
          plan: string | null
          songs_generated: number | null
          tour_completed: boolean | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          plan?: string | null
          songs_generated?: number | null
          tour_completed?: boolean | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          plan?: string | null
          songs_generated?: number | null
          tour_completed?: boolean | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reaction_videos: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean | null
          is_public: boolean | null
          order_id: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_public?: boolean | null
          order_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          is_public?: boolean | null
          order_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "reaction_videos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          allow_music_sample: boolean | null
          comment: string | null
          created_at: string
          id: string
          is_public: boolean | null
          order_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_music_sample?: boolean | null
          comment?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          order_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_music_sample?: boolean | null
          comment?: string | null
          created_at?: string
          id?: string
          is_public?: boolean | null
          order_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      share_analytics: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          order_id: string | null
          platform: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          order_id?: string | null
          platform?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          order_id?: string | null
          platform?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_analytics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
          version: number | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["track_status"]
          updated_at?: string
          version?: number | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["track_status"]
          updated_at?: string
          version?: number | null
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
      transcriptions: {
        Row: {
          audio_id: string
          created_at: string
          id: string
          model: string | null
          segments_json: Json | null
          transcript_text: string
          user_id: string
        }
        Insert: {
          audio_id: string
          created_at?: string
          id?: string
          model?: string | null
          segments_json?: Json | null
          transcript_text: string
          user_id: string
        }
        Update: {
          audio_id?: string
          created_at?: string
          id?: string
          model?: string | null
          segments_json?: Json | null
          transcript_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_audio_id_fkey"
            columns: ["audio_id"]
            isOneToOne: false
            referencedRelation: "audio_inputs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          plan_id: string
          purchased_at: string | null
          stripe_session_id: string | null
          total_credits: number
          updated_at: string | null
          used_credits: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_id: string
          purchased_at?: string | null
          stripe_session_id?: string | null
          total_credits: number
          updated_at?: string | null
          used_credits?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_id?: string
          purchased_at?: string | null
          stripe_session_id?: string | null
          total_credits?: number
          updated_at?: string | null
          used_credits?: number | null
          user_id?: string
        }
        Relationships: []
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
      video_order_files: {
        Row: {
          created_at: string
          file_name: string | null
          file_type: string
          file_url: string
          id: string
          sort_order: number | null
          video_order_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_type: string
          file_url: string
          id?: string
          sort_order?: number | null
          video_order_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_type?: string
          file_url?: string
          id?: string
          sort_order?: number | null
          video_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_order_files_video_order_id_fkey"
            columns: ["video_order_id"]
            isOneToOne: false
            referencedRelation: "video_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      video_orders: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          edited_video_delivered_at: string | null
          edited_video_url: string | null
          id: string
          order_id: string | null
          paid_at: string | null
          payment_status: string
          status: string
          updated_at: string
          user_id: string
          video_type: string
        }
        Insert: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          edited_video_delivered_at?: string | null
          edited_video_url?: string | null
          id?: string
          order_id?: string | null
          paid_at?: string | null
          payment_status?: string
          status?: string
          updated_at?: string
          user_id: string
          video_type?: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          edited_video_delivered_at?: string | null
          edited_video_url?: string | null
          id?: string
          order_id?: string | null
          paid_at?: string | null
          payment_status?: string
          status?: string
          updated_at?: string
          user_id?: string
          video_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_redemptions: {
        Row: {
          discount_applied: number
          id: string
          order_id: string | null
          redeemed_at: string | null
          user_id: string
          voucher_id: string
        }
        Insert: {
          discount_applied: number
          id?: string
          order_id?: string | null
          redeemed_at?: string | null
          user_id: string
          voucher_id: string
        }
        Update: {
          discount_applied?: number
          id?: string
          order_id?: string | null
          redeemed_at?: string | null
          user_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_user: number | null
          plan_ids: string[] | null
          stripe_coupon_id: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          plan_ids?: string[] | null
          stripe_coupon_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          plan_ids?: string[] | null
          stripe_coupon_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
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
      payment_status:
        | "PENDING"
        | "PAID"
        | "FAILED"
        | "REFUNDED"
        | "AWAITING_PIX"
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
      payment_status: ["PENDING", "PAID", "FAILED", "REFUNDED", "AWAITING_PIX"],
      track_status: ["QUEUED", "GENERATING", "READY", "FAILED"],
    },
  },
} as const
