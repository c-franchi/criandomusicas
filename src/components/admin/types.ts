export interface AdminOrder {
  id: string;
  status: string;
  created_at: string;
  music_type: string;
  music_style: string;
  story: string;
  user_id: string;
  final_prompt: string | null;
  style_prompt: string | null;
  approved_lyric_id: string | null;
  payment_status?: string;
  payment_method?: string;
  user_email?: string;
  lyric_title?: string;
  track_url?: string | null;
  user_whatsapp?: string | null;
  user_name?: string | null;
  is_instrumental?: boolean | null;
  instruments?: string[] | null;
  solo_instrument?: string | null;
  solo_moment?: string | null;
}

export interface PricingConfig {
  id: string;
  name: string;
  price_display: string;
  price_cents: number;
  price_promo_cents: number | null;
  stripe_price_id: string | null;
  is_active: boolean;
  is_popular: boolean;
}

export interface AudioSample {
  id: string;
  title: string;
  description: string;
  style: string;
  occasion: string;
  audio_url: string;
  cover_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Voucher {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  plan_ids: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface PixConfig {
  id: string;
  pix_key: string;
  pix_name: string;
  qr_code_url: string;
  is_active: boolean;
}

export interface ApprovedMusicTrack {
  order_id: string;
  audio_url: string;
  lyric_title: string | null;
  song_title: string | null;
  music_type: string | null;
  music_style: string | null;
  purpose: string | null;
  cover_url: string | null;
  lyric_body: string | null;
  user_name: string | null;
  created_at: string;
  story: string | null;
}
