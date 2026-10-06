# Unified Payment Funnel

Decision: the Instant ecosystem has one public payment funnel.

## Canonical architecture

```text
InstantSpeak ─┐
InstantStudy ─┤
InstantBible ─┤
InstantVest  ─┤
InstantCloser ┤──> Instant Pay ──> Paddle ──> webhook ──> entitlements
DotSpeak*    ─┤
Instant One ─┘
```

`* DotSpeak payment entry is guardian-only.`

Products no longer need to own their own public payment funnel. They only select an allowlisted offer key and redirect to Instant Pay.

## URL

```text
PAY_URL/?offer=<offer_key>&source=<app_key>
```

## Offer keys

- instant_speak_pro_monthly
- instant_speak_pro_annual
- instant_study_plus_monthly
- instant_study_plus_annual
- instant_study_unlimited_monthly
- instant_study_unlimited_annual
- instant_bible_pro_monthly
- instant_bible_pro_annual
- instant_vest_pro_monthly
- instant_vest_pro_annual
- instant_closer_pro_monthly
- instant_closer_pro_annual
- dotspeak_premium_monthly
- dotspeak_premium_annual
- instant_one_monthly
- instant_one_annual

Price IDs never appear in product clients.

## Current scope

This PR creates the funnel. Existing app-specific checkout logic can remain as a temporary fallback until every product points to the deployed Instant Pay URL. The final state has one public funnel and one central webhook/entitlement path.
