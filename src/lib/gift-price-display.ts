import liveCatalog from "../../docs/stripe-italy-live-catalog.json" with { type: "json" };
import { giftPlanId, type MusicalGift } from "./gifts.ts";
import { getLocalizedPrice } from "./i18n-format.ts";

type GiftOffer = Pick<
  MusicalGift,
  "product" | "music_source" | "duration_seconds" | "has_card" | "details"
>;

const italianPrices = new Map(
  liveCatalog.products.map((product) => [product.plan_id, product.unit_amount]),
);

const formatEur = (cents: number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);

/**
 * Formats a new gift offer without reinterpreting an existing payment.
 * Italian offers use the verified live EUR catalog, never a BRL conversion.
 */
export function formatGiftOfferPrice(
  brlCents: number,
  gift: GiftOffer,
  language: string,
): string | null {
  if (!language.toLowerCase().startsWith("it")) {
    return getLocalizedPrice(brlCents, language).formatted;
  }

  // The live Italian catalog currently has no physical-card or shipping prices.
  if (gift.product === "physical") return null;

  const basePrice = italianPrices.get(giftPlanId(gift));
  if (basePrice === undefined) return null;

  const cardPrice = gift.product === "short" && gift.has_card
    ? italianPrices.get("gift_short_card")
    : 0;
  if (cardPrice === undefined) return null;

  return formatEur(basePrice + cardPrice);
}
