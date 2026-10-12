# InstantStudy — Hardwall E2E acceptance (2026-10-12)

**Policy: KEEP HARD PAYWALL.** Do not convert InstantStudy to freemium to pass tests. The desired journey is `InstantStudy → IStudy splash → onboarding → Hard Paywall → verified account → Paddle subscription → verified entitlement → Orbital study → review`.

## Automated cross-service test (mocked providers)
Run `npm test` at monorepo root; core flow is `apps/web/api/hardwallJourney.test.js`. The test exercises real project handlers for InstantStudy Web checkout BFF, Instant Pay checkout and InstantStudy study BFF together with in-process Account introspection, Paddle transaction and subscription-entitlement responses. It verifies:

- Anonymous learner cannot call study endpoints or create a paid checkout.
- A logged-in learner without paid entitlement cannot access study.
- Checkout requires a valid signed-in account identity. The server uses the identity provider's validated user id as `custom_data.user_ref`, not a browser-supplied identity.
- Account mismatches are rejected before Paddle transaction creation.
- A successful transaction does **not** unlock study until an active subscription entitlement is independently verified.
- Active Plus subscription permits exactly that user's study request, with HMAC-signed server-to-server proof.
- Canceled or expired subscriptions lose access; an entitlement carrying `active=true` cannot override an expired or revoked status.
- Paddle `transaction.completed` is recorded but no longer independently provisions recurring entitlements. Only subscription lifecycle events provision subscriptions.
- Entitlement lookup respects subscription expiry, including family entitlements.

Other automation: `apps/pay/api/checkoutBinding.test.js`, `entitlementExpiry.test.js`, existing Web HMAC tests, TypeScript/Node/Flutter tests.

## Real-world E2E gates (NOT COVERED BY MOCKS)
1. Configure `INSTANT_ACCOUNT_INTROSPECTION_URL` and actual sign-up/sign-in. Verify login **does** populate an Instant Account session for the same user who pays.
2. Configure all secret Paddle sandbox environment variables for Instant Pay, non-production Neon branch, and signed webhooks. Do not use a real production card.
3. Confirm Paddle creates a subscription and emits `subscription.created/activated/trialing`; verify the signed event creates a paid entitlement bound to `user_ref`. Confirm duplicate events are idempotent.
4. Confirm cancellation, failed payment, pause, expiry and refund events correctly revoke or preserve access per explicit billing policy. Check race/out-of-order event ordering.
5. Deploy app, study API and pay API from the **same validated feature release** with signing secrets synchronized and `INSTANTSTUDY_HARD_PAYWALL_ENABLED=true` on Web/API.
6. Test PDF, DOCX, PPTX, audio recordings, image notes, Google Drive, Ask, guide/flashcard editing, Learn/Test/FSRS and Siri Orb interaction in real browser. Check no content or data leaks around the paywall.
7. For native iOS/Android, implement StoreKit/Google Play purchases, restore-purchases and receipts verified server-side. The native paywall placeholder **must not be considered a working store purchase flow**.
8. Add visual E2E through Playwright / real device and ZAP live scan. Use test data only.
9. Vercel preview builds are currently failing due build-rate limit; **no production deployment or live E2E pass is claimed**.

## Evidence and status
Code is in the feature PR, not production. Unit/in-process integration tests are meaningful regression gates but are **not live Paddle or Neon tests**. No production Neon records or billing settings were changed by these tests.

**Security note:** An account's access token is sent only as an Authorization header to the same-origin Web BFF and forwarded to the trusted Instant Pay server, where the account introspection service confirms the account before Paddle transaction creation. Never put access tokens in checkout URLs, query strings or logs.
