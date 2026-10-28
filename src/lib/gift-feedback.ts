export function giftFeedbackOrder(gift: {
  music_source: "existing" | "new";
  source_order_id: string | null;
  production_order_id: string | null;
}) {
  return gift.music_source === "existing" ? gift.source_order_id : gift.production_order_id;
}