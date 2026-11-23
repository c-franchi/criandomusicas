// @ts-nocheck -- Bun's test module is resolved by Bun, not the frontend TypeScript config.
import { describe, expect, test } from "bun:test";
import { checkoutReturnOrigin } from "../../supabase/functions/_shared/checkoutOrigin.ts";
import { escapeHtml } from "../../supabase/functions/_shared/html.ts";
import { isCreatorSubscriptionForUser } from "../../supabase/functions/_shared/stripeSubscription.ts";

describe("selected security fixes", () => {
  test("HTML email values escape markup and quotes", () => {
    expect(escapeHtml('<img src=x onerror="alert(\'x\')">')).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;",
    );
  });

  test("checkout keeps the Italian application origin", () => {
    const req = new Request("https://example.invalid", {
      headers: { origin: "https://creandomusica.it" },
    });
    expect(checkoutReturnOrigin(req)).toBe("https://creandomusica.it");
  });

  test("checkout rejects an external return origin", () => {
    const req = new Request("https://example.invalid", {
      headers: { origin: "https://attacker.example" },
    });
    expect(checkoutReturnOrigin(req)).toBe("https://criandomusicas.com.br");
  });

  test("subscription credit requires the same verified user ID", () => {
    const subscription = { metadata: { plan_type: "creator", user_id: "user-a" } };
    expect(isCreatorSubscriptionForUser(subscription, "user-a")).toBe(true);
    expect(isCreatorSubscriptionForUser(subscription, "user-b")).toBe(false);
  });
});
