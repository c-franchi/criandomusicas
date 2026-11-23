// @ts-nocheck -- Bun's test module is resolved by Bun, not the frontend TypeScript config.
import { expect, test } from "bun:test";
import { itLiveItemForOrderPlan } from "../../supabase/functions/_shared/itLiveCheckout";
import { euroAmountForPlan } from "./order-price-display";

test("3-song package costs €49,99 in Italy", () => {
  expect(itLiveItemForOrderPlan("package")?.unit_amount).toBe(4999);
  expect(euroAmountForPlan("package")).toBe(4999);
});
test("package is cheaper than 3 single songs", () => {
  expect(euroAmountForPlan("package")).toBeLessThan(3 * euroAmountForPlan("single"));
});
test("single song stays €19,99", () => {
  expect(itLiveItemForOrderPlan("single")?.unit_amount).toBe(1999);
});
