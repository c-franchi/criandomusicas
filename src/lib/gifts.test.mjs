import { test } from "node:test";
import assert from "node:assert/strict";
import {
  quoteGift,
  giftPlanId,
  parseLrc,
  giftUrl,
  safeImage,
} from "./gifts.ts";
import { mapGiftProduction } from "./briefingPurpose.ts";
const gift = {
  product: "digital",
  music_source: "existing",
  duration_seconds: null,
  has_card: true,
  details: {},
};
const price = (id, cents, active = true, promo = null) => ({
  id,
  name: id,
  price_cents: cents,
  price_promo_cents: promo,
  is_active: active,
});
test("unconfigured, inactive and zero prices never become a purchasable quote", () => {
  assert.equal(quoteGift(gift, []), null);
  assert.equal(quoteGift(gift, [price("gift_digital_existing", 0)]), null);
  assert.equal(
    quoteGift(gift, [price("gift_digital_existing", 100, false)]),
    null,
  );
  assert.equal(
    quoteGift(gift, [price("gift_digital_existing", 100, true, 0)]),
    null,
  );
});
test("existing song and new song use separate price IDs", () => {
  assert.equal(giftPlanId(gift), "gift_digital_existing");
  assert.equal(
    giftPlanId({ ...gift, music_source: "new" }),
    "gift_digital_new",
  );
  assert.equal(quoteGift(gift, [price("gift_digital_existing", 1234)]), 1234);
});
test("short song card is a configured add-on and never silently free", () => {
  const short = {
    ...gift,
    product: "short",
    music_source: "new",
    duration_seconds: 15,
  };
  const prices = [price("gift_short_15", 1000)];
  assert.equal(quoteGift({ ...short, has_card: false }, prices), 1000);
  assert.equal(quoteGift(short, prices), null);
  assert.equal(
    quoteGift(short, [...prices, price("gift_short_card", 300)]),
    1300,
  );
  assert.equal(giftPlanId({ ...short, duration_seconds: 30 }), "gift_short_30");
});
test("physical order requires real printing and shipping configuration", () => {
  const physical = {
    ...gift,
    product: "physical",
    details: { fulfillment: "shipping" },
  };
  const prices = [price("gift_physical_existing", 2000)];
  const ops = {
    physical_enabled: true,
    shipping_enabled: true,
    pickup_enabled: true,
    print_format: "Configured format",
    shipping_fee_cents: null,
  };
  assert.equal(quoteGift(physical, prices), null);
  assert.equal(quoteGift(physical, prices, ops), null);
  assert.equal(
    quoteGift(physical, prices, { ...ops, shipping_fee_cents: 500 }),
    2500,
  );
  assert.equal(
    quoteGift({ ...physical, details: { fulfillment: "pickup" } }, prices, ops),
    2000,
  );
  assert.equal(
    quoteGift(physical, prices, { ...ops, shipping_fee_cents: 0 }),
    2000,
  );
});
test("LRC parses real timestamps and rejects malformed timing", () => {
  assert.deepEqual(parseLrc("[00:12.50]One\n[00:01]Two"), [
    { time: 1, text: "Two" },
    { time: 12.5, text: "One" },
  ]);
  assert.deepEqual(parseLrc(""), []);
  for (const text of [
    "fake lyrics",
    "[00:60]No",
    "[-1:12]No",
    "[99:01]No",
    "[00:01]",
  ])
    assert.throws(() => parseLrc(text));
});
test("token URLs require 256-bit hexadecimal tokens", () => {
  const token = "a".repeat(64);
  assert.equal(
    giftUrl(token, "https://criandomusicas.com.br"),
    "https://criandomusicas.com.br/presente.html?token=" + token,
  );
  assert.throws(() => giftUrl("123", "https://example.com"));
});
test("image fields reject active schemes and mapping preserves funny, romantic and kids choices", () => {
  assert.equal(safeImage("javascript:alert(1)"), undefined);
  assert.equal(mapGiftProduction("funny", "pop").musicType, "parodia");
  assert.equal(mapGiftProduction("romantic", "pop").musicType, "romantica");
  assert.equal(
    mapGiftProduction("emotional", "infantil").musicType,
    "infantil",
  );
});

test("card duration selects a distinct configured price and never adds the standalone short-card fee", () => {
  const full = {...gift, music_source:"new"};
  const short = {...full, duration_seconds:15};
  const prices=[price("gift_digital_new",5000),price("gift_digital_new_15",1700),price("gift_digital_new_30",2300),price("gift_short_card",300)];
  assert.equal(giftPlanId(short),"gift_digital_new_15");
  assert.equal(quoteGift(short,prices),1700);
  assert.equal(quoteGift({...short,duration_seconds:30},prices),2300);
  assert.equal(quoteGift(full,prices),5000);
  assert.equal(quoteGift(short,[price("gift_digital_new",5000)]),null);
});
test("customer printing needs no postal operation or shipping charge and still honors the physical switch",()=>{
 const card={...gift,product:"physical",music_source:"new",duration_seconds:30,details:{fulfillment:"self_print"}};
 const prices=[price("gift_physical_new_30",2500)];
 const ops={physical_enabled:true,print_format:"A5",pickup_enabled:false,shipping_enabled:false,shipping_fee_cents:null};
 assert.equal(quoteGift(card,prices,ops),2500);
 assert.equal(quoteGift(card,prices,{...ops,physical_enabled:false}),null);
 assert.equal(quoteGift(card,prices,{...ops,print_format:null}),null);
});
