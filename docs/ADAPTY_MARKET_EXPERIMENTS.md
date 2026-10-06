# Adapty market and experiment plan

Adapty is the native-app growth layer. InstantPay/Paddle remains the web checkout and source for web entitlements.

## Scope

Use Adapty only on native app surfaces where App Store / Google Play billing is required or preferred.

- InstantSpeak: Adapty native purchase + InstantPay external entitlement recognition.
- InstantBible: Adapty native purchase + InstantPay web purchase recognition.
- DotSpeak: guardian-only Adapty purchase. Never open external checkout from the child runtime.
- InstantVest: enable Adapty when shipping native iOS/Android billing.
- InstantCloser: default to InstantPay/Paddle for B2B web checkout; only add store billing to native builds if the distribution model requires it.

## Stable placement IDs

Every native app should expose stable placements and let Adapty choose the audience/variant remotely:

- `onboarding`
- `upgrade`
- `winback`

Do not hard-code country-specific prices or paywall copy in the app. Store products define localized prices; Adapty placements, audiences and flows choose which offer is shown.

## Market audiences

Initial audience groups:

1. Tier 1: US, CA, GB, AU, NZ.
2. Europe: DE, FR, IT, ES, NL, SE, NO, DK, FI, CH, AT, IE, BE, PT.
3. LATAM: BR, MX, AR, CL, CO, PE.
4. India/SEA: IN, ID, PH, MY, TH, VN, SG.
5. Rest of world: fallback audience.

Country targeting belongs in Adapty audiences, not in client-side conditionals.

## First experiment sequence

Run one major variable at a time per audience:

1. Annual-first vs monthly-first.
2. Trial vs no trial.
3. Price-point test using store products configured at the intended price tiers.
4. Short benefit-first paywall vs feature-rich paywall.
5. Winback discount vs standard offer.

Use Adapty cross-placement tests only when the same variant must remain consistent across multiple placements.

## Localization

Pass the device/app locale to Adapty Flow & Paywall Builder. Maintain translated copy in Adapty, with English as the fallback. Do not ship a different app build per country.

## Guardrails

- A/B tests must be created as draft, QA'd on devices, then explicitly started.
- Never infer entitlement from the paywall result alone; confirm store/Adapty profile access level.
- Do not route child users to external checkout.
- Keep one access-level key per product, plus `instant_one.all` in the central entitlement service.
- Existing legacy Paywall Builder assets should be migrated to Flow & Paywall Builder for new work.

## Measurement

Primary: paid conversion and revenue per visitor.
Secondary: trial start, trial-to-paid, refund/cancel rate, renewal rate.
Guardrails: crash-free sessions, checkout errors, involuntary churn, support contacts.

Minimum decision rule: do not declare a winner from visual conversion alone; require enough purchase/renewal signal for the market being tested.
