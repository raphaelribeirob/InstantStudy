# Monetization — Adapty control plane

InstantStudy uses Adapty as the pricing and offer experimentation layer, not as a hard dependency of the study engine.

## Why

The product may run inside ChatGPT, Claude, Gemini-compatible clients, web surfaces, or future native apps. Pricing must therefore be controlled outside any single LLM host.

## Placement

Recommended Adapty placement ID:

```
instantstudy_main
```

The backend asks Adapty for the paywall assigned to this placement for a specific customer. Adapty can route that customer through:

- audiences;
- A/B tests;
- different products;
- different subscription periods;
- localized remote config.

No code release is required to change the active experiment.

## Price tests

Create separate Stripe products/prices for each real price point and attach them to separate Adapty paywalls.

Example experiment:

- A — $4.99/month
- B — $7.99/month
- C — $39/year

Do not merely change display copy while charging the same product. The paywall variation should reference the actual product/price being tested.

## Remote config

Use Adapty remote config for copy that may vary with the experiment:

```json
{
  "headline": "Study with your memory, not from scratch.",
  "cta": "Start InstantStudy Pro",
  "badge": "Best value"
}
```

The backend returns this payload unchanged to the LLM/client.

## Environment

```
ADAPTY_PUBLIC_API_KEY=
ADAPTY_SECRET_API_KEY=
ADAPTY_PLACEMENT_ID=instantstudy_main
ADAPTY_STORE=stripe
```

The public key is used for Adapty Web API paywall resolution and view attribution.

The secret key is optional in development but recommended in production so the backend can create/lookup profiles and keep experimentation identity stable.

## Rule

**Adapty decides which offer is shown. Stripe (or the configured store) remains the payment rail.**
