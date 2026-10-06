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
  -> Instant Pay
  -> POST /api/checkout { offer, source, locale }
  -> server allowlist resolves Paddle price
  -> Paddle transaction API
  -> transaction custom_data
  -> Paddle Hosted Checkout ?transaction_id=...
  -> Paddle webhook / central entitlement service
```

## Security invariants

1. Paddle API key is server-side only.
2. Price IDs are server-side environment variables only.
3. The client cannot set price, entitlement or arbitrary Paddle product IDs.
4. Offer keys are explicitly allowlisted.
5. Payment redirect never grants product access.
6. Fulfillment must happen from verified Paddle webhooks.
7. No user identity is trusted from query parameters.
8. DotSpeak checkout must only be linked from a guardian-controlled surface.
9. New paid checkout is unavailable unless self-service cancellation is configured.
10. Customers never need a support ticket to reach billing management.

## Paddle setup

Create one Hosted Checkout in Paddle and use its launch URL as:

```text
PADDLE_HOSTED_CHECKOUT_URL
```

Copy the Paddle customer portal sign-in URL and configure:

```text
PADDLE_CUSTOMER_PORTAL_URL
```

Instant Pay fails closed and refuses to create a new paid transaction unless
checkout, verified-webhook, and self-service cancellation are all configured.

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


## Adapty

When configured, Instant Pay resolves the active paywall server-side using
`ADAPTY_PLACEMENT_ID=instant_pay_main`. Remote config may select an allowlisted
`offer_key`; it can never inject a raw Paddle price ID or switch to another
product family. If Adapty is unavailable, checkout safely falls back to the
server-side catalog.

## InstantBible launch guard

InstantBible web checkout is intentionally fail-closed until InstantBible has
an authenticated web entitlement subject and server-side entitlement sync.
This prevents a successful charge from ever preceding the ability to grant
paid access. Mobile store billing through Adapty is unaffected.

## Webhook and fulfillment

Configure Paddle to send notifications to:

```text
/api/webhook
```

The handler verifies `Paddle-Signature` over the raw body with HMAC-SHA256,
rejects stale/replayed signatures outside the configured tolerance, and never
grants access from a browser redirect. Entitlement sync is server-to-server and
only runs when a trusted `entitlement_subject_id` is present in transaction
custom data.

## OWASP controls

The Instant ecosystem applies security controls at multiple layers:

- server-side price/offer allowlists
- no payment provider secrets in browser bundles
- strict checkout CSP and anti-framing headers
- API/MCP rate limiting
- CORS origin allowlists
- SSRF protection for remote study material
- dependency audit + OWASP Dependency-Check in CI
- Vercel managed firewall CRS where supported
