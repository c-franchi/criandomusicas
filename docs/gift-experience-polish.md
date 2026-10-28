# Gift experience and social previews

The existing login, lyric approval, payment/voucher and admin-release flows are retained. Product pages quote the real active catalog and the configured production estimate; there are no invented prices or deadlines. The homepage preserves all existing services, grouping specialist services in an expandable section. Public previews include selectable visual themes; their template choice survives the existing sign-in redirect.

## Sharing

Released gifts now share one of three real static HTML entry files:

- `presente.html?v=2`: digital card, preserving compatibility with installed clients. `presente-digital.html` is also accepted.
- `presente-curto.html`: short song.
- `presente-imprimir.html`: printable card.

Each contains a single 1200×630 PNG Open Graph image in `public/social`, a large-image Twitter card, noindex and no-referrer. Artwork is generic per product and never discloses a personal photo, dedication or lyric. The private capability stays in the link query. Legacy token URLs and `presente.html` remain valid. Previously sent messages and social-network caches cannot be retroactively edited; reshare the new product link. Actual QR codes continue to be generated from the gift URL, not the marketing artwork.

`gift_private.public_gift` now returns only one additional public field, `product`; all payment, release, scheduling, ownership and audio guards remain intact. The new page filename controls preview artwork, never access control.

## Usability and updates

The recipient hears/reads first and opens the reply form on demand. WhatsApp and native sharing are primary; other networks remain under More options. The buyer sees a prominent next action. Gift admin filters include product, stage and text search; music upload completion no longer moves unreleased gifts out of the active admin queue. In-app ready notifications and review reminders respect admin release and skip tests.

A manual app update reloads the same URL. Version checks run every minute, and the prompt is held while audio plays or a form/upload is active. Translations use the built entry hash to avoid stale copy. No automatic page reload is introduced. Already-open old bundles still require reopening/reloading once.

## Email reliability

Gift emails retry transient network/429/5xx failures up to three times with bounded backoff, timeout and the same provider idempotency key. Permanent provider failures remain visible. Owners can retry failed/pending reply notifications during the provider's safe deduplication window (23 hours), with identity and ownership checked server-side; accepted messages and test gifts cannot be sent again through that action. Admin can retry a gift-ready notification; the existing sent-event guard prevents duplicates. Provider acceptance is not claimed as inbox delivery. There is no invented scheduled retry worker or delivery receipt integration.

## Measurement and validation

The existing analytics provider receives product/step and checkout-request events only, gated by its existing consent setup. Public capability URLs and recipient interactions are excluded. There is no fabricated conversion dashboard.

Validate with `node --experimental-strip-types --test src/lib/gift-polish.test.mjs src/lib/email-retry.test.mjs src/lib/gift-sharing.test.mjs src/lib/gift-presentation.test.mjs src/lib/gift-response-handler.test.mjs src/lib/gift-ready-notifications.test.mjs`, app TypeScript and production build. Existing gift/payment/voucher/print SQL suites run in rollback transactions. Real payments, recipient replies and emails are not generated as verification.
