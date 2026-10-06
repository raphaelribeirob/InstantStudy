# Instant Billing

Status: installed in the web pricing funnel.

- Plus and Unlimited pricing CTAs can route through the central Instant Billing API.
- Existing offer checkout URLs remain the fallback.
- Entitlements: `instant_study.plus` and `instant_study.unlimited`.
- An authenticated `instant.account.session` with `userId` and `accessToken` is required.
- Without Instant Account or API configuration, the current funnel behavior is preserved.

Required web configuration:
- `VITE_INSTANT_BILLING_API_URL`
- optional plan-specific provider price IDs documented in `apps/web/src/instantBilling.ts`.
