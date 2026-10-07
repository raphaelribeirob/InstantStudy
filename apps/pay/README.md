# Instant Pay

One payment funnel for the Instant ecosystem.

## Public URL contract

```text
https://<pay-domain>/?offer=<offer_key>&source=<app_key>
```

Examples:

```text
/?offer=instant_speak_pro_monthly&source=instant_speak
/?offer=instant_study_unlimited_annual&source=instant_study
/?offer=instant_bible_pro_annual&source=instant_bible
```

The browser never sends a Paddle price ID. It sends only an allowlisted offer key.

## Flow

```text
Product CTA
  -> product backend
  -> POST /api/checkout { offer, source, locale, subject_id } with server auth
  -> server allowlist resolves Paddle price
  -> Paddle transaction API
  -> transaction custom_data
  -> Paddle Hosted Checkout ?transaction_id=...
  -> verified Paddle webhook /api/webhook
  -> Neon entitlement ledger
  -> product backend GET /api/entitlements?subject_id=...
```

## Security invariants

1. Paddle API key is server-side only.
2. Price IDs are server-side environment variables only.
3. The client cannot set price, entitlement or arbitrary Paddle product IDs.
4. Offer keys are explicitly allowlisted.
5. Payment redirect never grants product access.
6. Fulfillment must happen from verified Paddle webhooks.
7. Entitlement-bearing `subject_id` is accepted only with the shared server Bearer key.
8. Public/anonymous checkout remains possible, but cannot create a product entitlement identity.
9. Paddle webhooks are verified against the raw request body using `Paddle-Signature`.
10. Webhook event IDs are persisted for idempotency.
11. Product backends query entitlements with server authentication; clients never query the ledger directly.
12. DotSpeak checkout must only be linked from a guardian-controlled surface.

## Paddle setup

Create one Hosted Checkout in Paddle and use its launch URL as:

```text
PADDLE_HOSTED_CHECKOUT_URL
```

Hosted Checkout requires Paddle approval for live use. Sandbox can be used while approval is pending.

Create the catalog products/prices in Paddle and set the matching server-side environment variables.

## Vercel

Deploy this directory as its own Vercel project:

```text
Root Directory: apps/pay
Project: instant-pay
```

Recommended custom domain later:

```text
pay.<instant-domain>
```

Do not put provider secrets in `VITE_*` variables.


## Server-to-server contract

Products that need entitlement fulfillment call:

```http
POST /api/checkout
Authorization: Bearer <INSTANT_PAY_SERVER_KEY>
Content-Type: application/json

{
  "offer": "instant_closer_pro_monthly",
  "source": "instant_closer",
  "locale": "en",
  "subject_id": "instant_closer:company:42"
}
```

Paddle receives `subject_id` and the allowlisted `entitlement_key` only through
transaction `custom_data`. Paddle propagates transaction custom data to the
subscription and subsequent subscription transactions.

Products resolve access through:

```http
GET /api/entitlements?subject_id=instant_closer:company:42
Authorization: Bearer <INSTANT_PAY_SERVER_KEY>
```

The response exposes `provider: instant_pay`; the underlying processor remains
an implementation detail.

## Entitlement configuration

Required for fulfillment:

```text
INSTANT_PAY_SERVER_KEY
INSTANT_PAY_DATABASE_URL
PADDLE_WEBHOOK_SECRET
PADDLE_WEBHOOK_TOLERANCE_SECONDS=300
```

Configure the Paddle notification destination to:

```text
https://<pay-domain>/api/webhook
```
