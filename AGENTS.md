# Architecture rules
- Keep gift marketing on the homepage and recurring-plan marketing on the lazy-loaded /criadores page; reuse existing checkout flows to avoid billing changes.
- Read commercial plan values from pricing_config and show an unavailable state on fetch failure; never fabricate purchasable fallback prices or credits.
- Keep marketing translations in the home/pricing namespaces for all four supported languages and use the existing currency formatter.
- Resolve legacy Creator campaign hashes at the router boundary without redirecting ordinary package visitors.
- Classic Vite serves one static head to non-JavaScript crawlers; route SEO is client-side and must not be represented as server-rendered social previews.- Briefing entry is purpose-first; purpose→musicType/route mapping lives only in src/lib/briefingPurpose.ts (tested) so quick orders are never silently classified as homenagem.
