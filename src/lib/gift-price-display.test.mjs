import { test } from "node:test";
import assert from "node:assert/strict";
import { formatGiftOfferPrice } from "./gift-price-display.ts";

const gift = {
  product: "digital",
  music_source: "new",
  duration_seconds: null,
  has_card: true,
  details: { fulfillment: "self_print" },
};

test("Italian short-song offers use the exact live EUR prices", () => {
  const short = { ...gift, product: "short", duration_seconds: 15, has_card: false };
  assert.equal(formatGiftOfferPrice(990, short, "it"), "4,99 €");
  assert.equal(formatGiftOfferPrice(990, { ...short, duration_seconds: 30 }, "it-IT"), "7,99 €");
});

test("Italian card bundles and existing-song cards use their own live EUR prices", () => {
  assert.equal(formatGiftOfferPrice(990, { ...gift, duration_seconds: 15 }, "it"), "9,99 €");
  assert.equal(formatGiftOfferPrice(990, { ...gift, duration_seconds: 30 }, "it"), "12,99 €");
  assert.equal(formatGiftOfferPrice(4990, gift, "it"), "24,99 €");
  assert.equal(formatGiftOfferPrice(990, { ...gift, music_source: "existing" }, "it"), "4,99 €");
});

test("the short-song card add-on is included in the displayed Italian total", () => {
  const short = { ...gift, product: "short", duration_seconds: 15, has_card: true };
  assert.equal(formatGiftOfferPrice(990, short, "it"), "9,98 €");
});

test("Brazilian offers remain in BRL and unconfigured Italian physical delivery has no invented price", () => {
  assert.equal(formatGiftOfferPrice(990, gift, "pt-BR"), "R$ 9,90");
  assert.equal(formatGiftOfferPrice(990, { ...gift, product: "physical" }, "it"), null);
});
