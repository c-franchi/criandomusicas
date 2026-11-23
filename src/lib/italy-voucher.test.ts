// @ts-nocheck -- Bun's test module is resolved by Bun, not the frontend TypeScript config.
import { describe, expect, test } from "bun:test";
import { quoteItLiveVoucher } from "../../supabase/functions/_shared/itLiveVoucher.ts";
import { canShareInMarket, voucherShareText, voucherShareUrl } from "./voucher-share";

const v = (o = {}) => ({ id: "1", code: "ITALIA90", discount_type: "percent", discount_value: 90, is_active: true, valid_from: null, valid_until: null, max_uses: null, current_uses: 0, plan_ids: null, max_uses_per_user: null, ...o });

describe("Italian euro vouchers", () => {
  test("percent voucher discounts the €19.99 song", () => {
    expect(quoteItLiveVoucher(v({ discount_value: 50 }), 1999, 0)).toEqual({ ok: true, discount: 1000, final: 999 });
  });
  test("fixed BRL voucher is refused in euro", () => {
    expect(quoteItLiveVoucher(v({ discount_type: "fixed", discount_value: 500 }), 1999, 0)).toEqual({ ok: false, error: "currency" });
  });
  test("100% voucher is refused (below €0.50 minimum)", () => {
    expect(quoteItLiveVoucher(v({ discount_value: 100 }), 1999, 0).ok).toBe(false);
  });
  test("voucher limited to another plan is refused", () => {
    expect(quoteItLiveVoucher(v({ plan_ids: ["package"] }), 1999, 0)).toEqual({ ok: false, error: "plan" });
  });
  test("package voucher applies to the €49.99 package order", () => {
    expect(quoteItLiveVoucher(v({ plan_ids: ["package"] }), 4999, 0, new Date(), "package")).toEqual({ ok: true, discount: 4499, final: 500 });
  });
  test("per-user limit is enforced", () => {
    expect(quoteItLiveVoucher(v({ max_uses_per_user: 1 }), 1999, 1)).toEqual({ ok: false, error: "user_limit" });
  });
});

describe("voucher sharing per market", () => {
  test("Italy shares in Italian with creandomusica.it", () => {
    const t = voucherShareText(v(), "IT");
    expect(t).toContain("Usa il codice");
    expect(t).toContain("https://creandomusica.it");
    expect(voucherShareUrl(v(), "IT")).toBe("https://creandomusica.it?voucher=ITALIA90");
  });
  test("Brazil shares in Portuguese with criandomusicas.com.br", () => {
    const t = voucherShareText(v({ discount_type: "fixed", discount_value: 500 }), "BR");
    expect(t).toContain("R$ 5,00 de desconto");
    expect(t).toContain("https://criandomusicas.com.br");
  });
  test("fixed vouchers are not offered for Italy", () => {
    expect(canShareInMarket(v({ discount_type: "fixed" }), "IT")).toBe(false);
  });
});
