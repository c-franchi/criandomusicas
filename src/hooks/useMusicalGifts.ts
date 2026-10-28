import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";
import type { MusicalGift } from "@/lib/gifts";
export function useGiftList(admin = false) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["musical-gifts", user?.id, admin],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("musical_gifts")
        .select(
          "id,product,music_source,recipient_name,sender_name,status,is_test,created_at,amount_cents,production_order_id,checkout_order_id,available_from",
        )
        .order("created_at", { ascending: false });
      if (!admin) q = q.eq("owner_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    refetchInterval: admin ? 60000 : 15000,
  });
}
export function useGift(id?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["musical-gift", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("musical_gifts")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });
}
export function useGiftCatalog() {
  return useQuery({
    queryKey: ["gift-catalog"],
    queryFn: async () => {
      const results = await Promise.all([
        supabase
          .from("pricing_config")
          .select("id,name,price_cents,price_promo_cents,is_active")
          .like("id", "gift_%"),
        supabase.from("gift_operations").select("*").eq("id", true).single(),
      ]);
      for (const r of results) if (r.error) throw r.error;
      return { prices: results[0].data!, operations: results[1].data! };
    },
  });
}
export function useOwnedGiftMusic() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["gift-owned-music", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id,song_title,cover_url")
        .eq("user_id", user!.id)
        .or("is_preview.eq.false,is_preview.is.null")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!orders.length) return [];
      const { data: tracks, error: te } = await supabase
        .from("tracks")
        .select("order_id,version,audio_url")
        .in(
          "order_id",
          orders.map((o) => o.id),
        )
        .eq("status", "READY");
      if (te) throw te;
      return tracks
        .filter((t) => t.audio_url)
        .map((t) => ({
          ...t,
          title:
            orders.find((o) => o.id === t.order_id)?.song_title ||
            "Criando Músicas",
        }));
    },
  });
}
export function useGiftCommands() {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["musical-gift"] });
    void qc.invalidateQueries({ queryKey: ["musical-gifts"] });
    void qc.invalidateQueries({ queryKey: ["gift-history"] });
    void qc.invalidateQueries({ queryKey: ["gift-audio"] });
  };
  return {
    save: async (id: string, data: Partial<MusicalGift>, version: number) => {
      const r = await supabase.rpc("save_musical_gift", {
        p_id: id,
        p_data: data as unknown as Json,
        p_expected_version: version,
      });
      if (r.error) throw r.error;
      refresh();
      return r.data;
    },
    action: async (
      id: string,
      action: string,
      data: Record<string, unknown> = {},
    ) => {
      const r = await supabase.rpc("musical_gift_action", {
        p_id: id,
        p_action: action,
        p_data: data as Json,
      });
      if (r.error) throw r.error;
      refresh();
      if (action === 'publish') {
        const { data: gift, error } = await supabase.from('musical_gifts').select('owner_id,checkout_order_id,production_order_id,is_test,status').eq('id', id).single();
        if(error) throw new Error('gift_released_notification_failed');
        if (!error && gift?.status === 'ACTIVE' && !gift.is_test) {
          const orderId = gift.checkout_order_id || gift.production_order_id;
          const results = await Promise.allSettled([
            supabase.functions.invoke('send-music-ready-email', {body:{userId:gift.owner_id,orderId}}),
            supabase.functions.invoke('send-push-notification', {body:{user_id:gift.owner_id,order_id:orderId,notification_type:'gift_ready',title:'🎁 Seu presente musical foi liberado!',body:'Seu cartão foi conferido e liberado. Acesse para compartilhar.',url:`/presentes/${id}`}}),
          ]);
          if (results.some(r => r.status === 'rejected' || r.value.error)) {
            // The gift is released even if an external notification channel fails.
            throw new Error('gift_released_notification_failed');
          }
        }
      }
      return r.data as {
        id: string;
        production_order_id: string | null;
        checkout_order_id: string | null;
        status: string;
      };
    },
  };
}

export function useGiftAudio(g?: MusicalGift) {
  const id =
    g?.music_source === "existing" ? g.source_order_id : g?.production_order_id;
  return useQuery({
    queryKey: ["gift-audio", id, g?.track_version],
    enabled: !!id,
    queryFn: async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .select("song_title,cover_url,approved_lyric_id,status,payment_status")
        .eq("id", id!)
        .single();
      if (error) throw error;
      const { data: tracks, error: te } = await supabase
        .from("tracks")
        .select("audio_url,version,duration_seconds")
        .eq("order_id", id!)
        .eq("status", "READY");
      if (te) throw te;
      const track = tracks?.find(t => t.version === g!.track_version);
      let lyrics: string | null = null;
      let approvedLyricId: string | null = null;
      if (order.approved_lyric_id) {
        const { data, error: le } = await supabase
          .from("lyrics")
          .select("body,is_approved")
          .eq("id", order.approved_lyric_id)
          .single();
        if (le) throw le;
        lyrics = data.body;
        if(data.is_approved) approvedLyricId = order.approved_lyric_id;
      }
      return {
        status: order.status,
        payment_status: order.payment_status,
        approved_lyric_id: approvedLyricId,
        title: order.song_title,
        cover_url: order.cover_url,
        audio_url: track?.audio_url,
        duration_seconds: track?.duration_seconds,
        uploadedVersions: tracks?.filter(t=>!!t.audio_url).map(t=>t.version!) || [],
        lyrics,
      };
    },
    refetchInterval: 15000,
  });
}

export function useGiftBackgrounds(enabled = true) {
  return useQuery({
    queryKey: ["gift-backgrounds"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_backgrounds")
        .select("id,label,image_data,is_active")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}
