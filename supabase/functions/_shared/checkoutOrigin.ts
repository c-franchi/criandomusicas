const DEFAULT_CHECKOUT_ORIGIN = "https://criandomusicas.com.br";

const ALLOWED_CHECKOUT_ORIGINS = new Set([
  DEFAULT_CHECKOUT_ORIGIN,
  "https://www.criandomusicas.com.br",
  "https://criandomusicas.lovable.app",
  "https://id-preview--8b44c89b-d4bc-4aa8-b6fd-85522e79ace9.lovable.app",
  "https://creandomusica.it",
  "https://www.creandomusica.it",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

/** Only return to an application-owned origin, never a caller-chosen site. */
export function checkoutReturnOrigin(req: Request): string {
  const requested = req.headers.get("origin");
  if (!requested) return DEFAULT_CHECKOUT_ORIGIN;
  try {
    const origin = new URL(requested).origin;
    return ALLOWED_CHECKOUT_ORIGINS.has(origin) ? origin : DEFAULT_CHECKOUT_ORIGIN;
  } catch {
    return DEFAULT_CHECKOUT_ORIGIN;
  }
}
