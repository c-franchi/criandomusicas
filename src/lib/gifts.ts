import type { GiftProduct } from "@/components/gifts/products";
export type GiftStatus =
  | "DRAFT"
  | "AWAITING_PAYMENT"
  | "RECEIPT_SENT"
  | "PAID"
  | "APPROVED_TEST"
  | "PRODUCTION"
  | "ACTIVE"
  | "CANCELLED";
export const giftThemes = [
  "christmas",
  "love",
  "birthday",
  "family",
  "birth",
  "friendship",
  "gratitude",
  "tribute",
  "wedding",
  "any",
] as const;
export interface GiftDetails {
  story?: string;
  relationship?: string;
  feelings?: string;
  tone?: string;
  style?: string;
  language?: string;
  notes?: string;
  music_type?: string;
  fulfillment?: string;
  address?: string;
}
export type MusicalGift = {
  id: string;
  owner_id: string;
  product: GiftProduct;
  music_source: "existing" | "new";
  source_order_id: string | null;
  production_order_id: string | null;
  track_version: number;
  recipient_name: string;
  sender_name: string;
  dedication: string;
  occasion: string;
  theme: (typeof giftThemes)[number];
  photo_data: string | null;
  details: GiftDetails;
  has_card: boolean;
  duration_seconds: number | null;
  delivery_channel: "link" | "whatsapp" | "email";
  available_from: string | null;
  status: GiftStatus;
  plan_id: string | null;
  amount_cents: number | null;
  shipping_cents: number;
  receipt_path: string | null;
  payment_confirmed_at: string | null;
  approved_by: string | null;
  is_test: boolean;
  public_token: string;
  lyric_cues: LyricCue[];
  shipping_status: "PENDING" | "PRINT_READY" | "SHIPPED" | "DELIVERED";
  tracking_code: string | null;
  admin_message: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};
export type GiftOperations = {
  id: boolean;
  physical_enabled: boolean;
  pickup_enabled: boolean;
  shipping_enabled: boolean;
  shipping_fee_cents: number | null;
  print_format: string | null;
  production_estimate: string | null;
  updated_at: string;
};
export interface LyricCue {
  time: number;
  text: string;
}
export interface GiftPresentation {
  recipient_name: string;
  sender_name: string;
  dedication: string;
  theme: string;
  photo_data?: string | null;
  occasion?: string;
  audio_url?: string | null;
  title?: string;
  cover_url?: string | null;
  lyrics?: string | null;
  lyric_cues?: LyricCue[];
  is_test?: boolean;
  has_card?: boolean;
}
export interface GiftPrice {
  id: string;
  name: string;
  price_cents: number;
  price_promo_cents: number | null;
  is_active: boolean | null;
}
export function giftPlanId(
  g: Pick<MusicalGift, "product" | "music_source" | "duration_seconds">,
) {
  return g.product === "short"
    ? `gift_short_${g.duration_seconds}`
    : `gift_${g.product}_${g.music_source}`;
}
export function quoteGift(
  g: Pick<
    MusicalGift,
    "product" | "music_source" | "duration_seconds" | "has_card" | "details"
  >,
  prices: GiftPrice[],
  ops?: GiftOperations,
): number | null {
  const price = (id: string) => {
    const p = prices.find((p) => p.id === id && p.is_active);
    const n = p?.price_promo_cents ?? p?.price_cents;
    return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
  };
  let total = price(giftPlanId(g));
  if (total === null) return null;
  if (g.product === "short" && g.has_card) {
    const add = price("gift_short_card");
    if (add === null) return null;
    total += add;
  }
  if (g.product === "physical") {
    if (!ops?.physical_enabled || !ops.print_format?.trim()) return null;
    if (g.details.fulfillment === "pickup" && ops.pickup_enabled) return total;
    if (
      g.details.fulfillment !== "shipping" ||
      !ops.shipping_enabled ||
      ops.shipping_fee_cents === null
    )
      return null;
    total += ops.shipping_fee_cents;
  }
  return total;
}
export function parseLrc(input: string): LyricCue[] {
  if (!input.trim()) return [];
  const cues: LyricCue[] = [];
  for (const line of input.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const m = line.match(/^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.+)$/);
    if (!m || Number(m[2]) >= 60) throw Error("gift_invalid_cues");
    const time =
      Number(m[1]) * 60 + Number(m[2]) + Number("0." + (m[3] || "0"));
    if (time > 3600 || m[4].length > 500) throw Error("gift_invalid_cues");
    cues.push({ time, text: m[4] });
  }
  if (cues.length > 300) throw Error("gift_invalid_cues");
  return cues.sort((a, b) => a.time - b.time);
}
export function giftUrl(token: string, origin = window.location.origin) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw Error("gift_invalid_token");
  return `${origin}/presente/${token}`;
}
export function safeImage(url: string | null | undefined) {
  return url?.startsWith("https://") || url?.startsWith("data:image/")
    ? url
    : undefined;
}
export async function prepareGiftPhoto(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 8 * 1024 * 1024
  )
    throw Error("gift_invalid_photo");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40000000)
      throw Error("gift_invalid_photo");
    const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw Error("gift_invalid_photo");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.65, 0.45, 0.25]) {
      const data = canvas.toDataURL("image/jpeg", quality);
      if (data.length <= 230000) return data;
    }
    throw Error("gift_invalid_photo");
  } finally {
    bitmap.close();
  }
}
