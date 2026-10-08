# Instant Pay

One web payment funnel for the Instant ecosystem.

## Public URL contract

```text
https://<pay-domain>/?offer=<offer_key>&source=<app_key>
```

The browser sends only an allowlisted offer key. Paddle price IDs and provider credentials remain server-side.

## Production flow

```text
Product CTA
  -> Instant Pay
  -> POST /api/checkout
  -> server allowlist resolves Paddle price + entitlement
  -> Paddle transaction
  -> Paddle Hosted Checkout
  -> signed POST /api/webhook
  -> Neon billing_events + billing_entitlements
  -> authenticated GET /api/entitlements
```

## Security invariants

1. Paddle API key and price IDs are server-side only.
2. Offer keys are explicitly allowlisted.
3. Payment redirects never grant access.
4. Paddle webhook signatures are verified against the raw body.
5. Webhook events are idempotent by Paddle event ID.
6. Entitlement lookup requires a validated Instant Account Bearer identity.
7. Query-string user IDs are never trusted as authority.
8. DotSpeak checkout remains guardian-controlled.
9. Mobile store purchases remain native/Adapty where store policy requires them.

## Required production configuration

- `PADDLE_ENV`
- `PADDLE_API_KEY`
- `PADDLE_HOSTED_CHECKOUT_URL`
- `PADDLE_WEBHOOK_SECRET`
- all active `PADDLE_PRICE_*` mappings
- `DATABASE_URL` (Neon/Postgres)
- `INSTANT_ACCOUNT_INTROSPECTION_URL`

Configure the Paddle notification destination to:

```text
https://<pay-domain>/api/webhook
```

Subscribe at minimum to transaction completion and subscription lifecycle events.

## Entitlements

`GET /api/entitlements?user_id=<id>` requires the user's Bearer token. The configured Instant Account introspection endpoint must return an authenticated identity containing `id`, `sub`, or `user_id`, and preferably `email`.

Instant One expands to consumer-product entitlements in the API. InstantCloser remains outside the consumer bundle.

## Native billing and Adapty

InstantPay is the web/Paddle funnel. Adapty owns native paywall delivery, localized store prices, audiences and experiments. See `docs/ADAPTY_MARKET_EXPERIMENTS.md`.

## Vercel

Project: `instant-pay`
Root Directory: `apps/pay`

Temporary project hostname:
`https://instant-pay-gamma.vercel.app`

Target custom domain after registration:
`https://pay.instantcreative.app`


## InstantStudy Family

The annual Family offer resolves to `instant_study.family`.

- the purchaser is the owner;
- the owner receives InstantStudy Unlimited;
- the owner can add up to four member emails through the authenticated Family API;
- each member receives inherited Unlimited while the owner's Family entitlement remains active;
- member libraries, mastery, usage and review queues remain independent;
- removing a member or ending the Family subscription removes inherited access.

Authenticated endpoint:

```text
GET|POST|DELETE /v1/billing/family
```

The API never accepts a query-string user ID as authority; it resolves the owner from the Instant Account bearer identity.

## InstantSpeak secure binding (draft integration)

InstantSpeak accounts are NOT purchased through an arbitrary `?user_id=` parameter. A signed-in **Neon account** requests `POST /api/config?action=checkout-intent` with a Bearer app session. InstantSpeak returns a short-lived HMAC checkout intent; the user opens `/?offer=...&source=instant_speak&intent=...`. This checkout cannot proceed without a valid 5-minute intent signed by the product server. The central server verifies the offer and embeds the verified account ID into Paddle transaction `custom_data`. Payment does not grant access by redirect.

Paddle authenticates `POST /api/webhook` using the untouched raw body. A verified event that carries `subject_verified=instant_speak_bridge_v1` is forwarded to InstantSpeak via a second HMAC-authenticated server-to-server callback. **A retry of the same Paddle event must retry this callback**; InstantSpeak deduplicates delivery in Neon. The central ledger continues to serve the other Instant products.

Shared secret on BOTH services (at least 32 unpredictable bytes): `INSTANT_PAY_BRIDGE_SECRET`. Central-only variables: `INSTANT_SPEAK_BILLING_WEBHOOK_URL` (HTTPS), `INSTANT_PAY_METADATA_TOKEN` (>=32 random bytes, also set as `INSTANT_PAY_OFFER_METADATA_TOKEN` on InstantSpeak), Paddle sandbox credentials, `DATABASE_URL`, and `PADDLE_WEBHOOK_SECRET`. Speak-only metadata URL: `INSTANT_PAY_OFFER_METADATA_URL=https://instant-pay-gamma.vercel.app/api/offer-metadata`.

No provider secret, product price ID or backend bridge secret belongs in Flutter, a web URL or VITE env. Preview prices come directly from Paddle `/pricing-preview` and are estimates for the requested country; **the final localized price/tax is shown by Paddle before purchase**. Configuring these variables, performing an approved Paddle sandbox checkout and verifying an exact Neon entitlement are required before live launch. Do not assume Paddle hosted checkout is Apple or Google compliant for an in-app digital subscription; route native checkout through Adapty/StoreKit or Play Billing where required.
