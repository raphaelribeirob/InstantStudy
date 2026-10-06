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
  -> POST /api/paywall
  -> Adapty placement / audience / A-B variation
  -> allowlisted Instant offer
  -> POST /api/checkout
  -> server allowlist resolves Paddle price
  -> Paddle transaction API
  -> transaction custom_data + Adapty attribution IDs
  -> Paddle Hosted Checkout ?transaction_id=...
  -> verified Paddle webhook
  -> central entitlement service
  -> Adapty transaction attribution
```

Adapty is the optimization layer. Paddle remains the payment processor.
If Adapty is unavailable, Instant Pay falls back to the original allowlisted
offer so experiments never make checkout unavailable.

### Adapty remote config contract

A variation may return these optional remote-config keys:

```json
{
  "offer_key": "instant_bible_pro_annual",
  "eyebrow": "SCRIPTURE",
  "title": "Build a consistent daily Scripture practice.",
  "description": "Unlock the complete personalized Scripture-to-action experience.",
  "cta": "Start my plan"
}
```

`offer_key` can only switch to another allowlisted offer for the same product.
Adapty never sends a Paddle price ID to the browser.

## Security invariants

1. Paddle API key is server-side only.
2. Price IDs are server-side environment variables only.
3. The client cannot set price, entitlement or arbitrary Paddle product IDs.
4. Offer keys are explicitly allowlisted.
5. Payment redirect never grants product access.
6. Fulfillment must happen from verified Paddle webhooks.
7. No user identity is trusted from query parameters.
8. DotSpeak checkout must only be linked from a guardian-controlled surface.
9. Adapty may select copy or another allowlisted offer for the same product only.
10. Adapty public/secret keys stay server-side in Instant Pay.
11. Adapty variation/paywall IDs are attribution metadata, never proof of access.

## Adapty setup

Create a dedicated Adapty app for InstantPayments, then configure:

```text
ADAPTY_PUBLIC_API_KEY
ADAPTY_SECRET_API_KEY
ADAPTY_STORE=paddle
ADAPTY_PLACEMENT_ID=instant_pay_main
```

Product-specific placements may override the fallback placement through the
`ADAPTY_PLACEMENT_*` variables documented in `.env.example`.

The browser gets a persistent anonymous Instant Pay ID used only for stable
Adapty audience/variation assignment. Email, journal content, spiritual
answers, study material and other product content must not be sent to Adapty.

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

## OWASP security gate

InstantPayments uses an OWASP-oriented security baseline:

- Same-origin enforcement on browser POST requests to payment APIs.
- JSON-only API contract with an 8 KiB request-body ceiling.
- CSP, HSTS, frame denial, MIME sniffing denial and cross-origin isolation headers.
- OWASP Dependency-Check 13.0.0 for scheduled/manual SCA. High-severity CVSS 7+ findings fail the scan.
- OWASP ZAP Baseline for scheduled/manual DAST against the deployed Instant Pay origin.
- Security action SHAs and the Dependency-Check release checksum are pinned.

Recommended repository secret:

```text
NVD_API_KEY
```

Dependency-Check can run without it, but NVD rate limits make CI materially slower.

Optional repository variable:

```text
INSTANT_PAY_SECURITY_TARGET=https://<canonical-instant-pay-domain>
```

Do not point ZAP at Paddle or Adapty. The scan target is the InstantPayments surface we control.
