# Shared responsive admin navigation

Replaces the separate large headers of orders, gift administration, settings and email marketing with `AdminHeader`. Four route links use a four-track `minmax(0,1fr)` grid at every width; labels wrap rather than widening the viewport. Home is a separate accessible icon link. Order refresh remains visible; maintenance and the existing manual push test are under “Mais ações”. No automatic push is sent by these changes.

Product filters use one grid rather than two breakpoint-dependent copies. Search has a short placeholder and a complete accessible label. Existing counts, filters and the one-minute polling interval remain. Configuration categories use two mobile columns and three wider columns. Marketing has campaign and history tabs. The selected gift view has production/release, preview and timed lyrics tabs. The latter panels use `forceMount` and inactive hiding, so changing tabs does not cancel an upload or clear unfinished input. On mobile the selected gift hides list filters and retains the back-to-list action.

This change does not alter database state, payment, voucher, approval or release rules. Admin GiftShell receives an explicit shared header; public gift pages keep their original header.

Validation: TypeScript and production build, including static SEO/PWA validation; existing batch loading, upload, notification gating and gift wizard tests. Browser verification of authenticated admin screens remains unavailable without an authenticated session. The cloud browser cannot reach the local Vite instance. CSS and successful build alone are not a measured no-overflow browser test. Mobile manual checks should cover 320, 360, 390, 640 and 768 CSS pixels, larger text, long names/prompts, open actions, file upload, tab changes, and configuration managers with tables/dialogs.

Rollback base: branch `backup/antes-abas-adm-mobile-2026-10-29` at `4aa0e47bfaac19edcd9f694d160fd66bf530d5bc`. Reverting this UI change must not undo the previous atomic lyric approval database repair.
