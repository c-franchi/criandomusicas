# Native installation and notification opt-in

The application captures `beforeinstallprompt` during bootstrap, before the installation page loads. A single controller retains the event across SPA navigation. Header, mobile menu, dashboard and the soft installation invitation call the same native prompt synchronously from a click. Each event is consumed once, duplicate clicks are ignored and dismissal is respected for seven days in the invitation. Manual installation controls remain accessible.

Acceptance of the native dialog is a pending state. Only `appinstalled` or a standalone launch confirms installation. Notification setup follows that confirmation and survives navigation/sign-in through a local pending marker. Orders' push subscriptions still belong to authenticated accounts. Signed-out visitors are invited to sign in; the real notification permission dialog opens only from the subsequent Enable button. A denied permission is respected, an existing permission reused and subscription success is shown only after the existing database upsert succeeds. No installation or permission is silently granted.

The existing push service, VAPID lookup and subscription persistence are reused. No backend, database policy, price, payment or recipient-card flow changes. Global invitations are hidden on private gift experiences, authentication, admin, protected forms and while a flow is busy. The dashboard's premature notification banner is replaced by the centralized post-install invitation.

Browsers that do not expose the native installer show an honest unavailable/waiting state. Manual menu/three-dot tutorials have been removed. This includes limitations of Safari/iOS and embedded browsers; no fake install button is provided. The browser and operating system retain final control over installability and consent.

Validation: `node --experimental-strip-types --test src/lib/pwa-install.test.mjs src/lib/push-opt-in.test.mjs src/lib/pwa-install-ui.test.mjs`, application/config TypeScript and production build. Tests use simulated browser events and mocked push persistence: they do not install an app, enable real browser notifications or create a real subscription. Native OS confirmation still requires a compatible physical-device check.

References: https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent/prompt ; https://developer.mozilla.org/en-US/docs/Web/API/Window/appinstalled_event ; https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static
