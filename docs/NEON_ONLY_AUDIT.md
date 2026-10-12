# InstantStudy — Neon-only persistence audit

## Architecture decision

Neon PostgreSQL is the **only externally connected database** in InstantStudy.

- **InstantStudy API**: `@neondatabase/serverless` and server-only `DATABASE_URL`; stores materials, adaptive sessions, mastery, reviews, quota counters, study rooms and entitlements.
- **InstantPay**: its **own Neon project and production database**, accessed only by its server API through `DATABASE_URL`; stores payment/account ledgers and related state.
- **InstantStudy Web/PWA**: connects only to the authenticated Web BFF / InstantStudy API / payment API; no database credential or browser-side database client.
- **Flutter**: connects through the API, not to PostgreSQL directly.
- **Google Drive Picker** is a file source integration, not a database.
- Unit tests may inject in-memory stores. Production server-side persistence must never silently fall back to an in-memory store.

## Completed audit

- Repository inventory and inspected code/config show no legacy alternate database SDK, native config, cloud project file, build plugin, or environment variable for another persistence provider.
- `scripts/assert-neon-only.mjs` audits all Git-tracked textual files; CI now fails if a legacy provider reference is reintroduced.
- Dedicated Neon projects **InstantStudy** and **InstantPay** were verified reachable with read-only SQL on both their default production and preview branches.
- The Vercel server projects `instantstudy-api` and `instant-pay` now have encrypted, server-only `DATABASE_URL` configuration for **production**; existing preview/development DB connection settings were preserved.
- The Web Vercel project intentionally has **no** `DATABASE_URL`. Frontend credentials must never point directly at Neon.
- Server-only API and billing credentials are unchanged; this database cleanup does not modify the identity provider or user subscriptions.
- No delete/drop/migration against production data was performed. No production deployment was triggered.

## Required go-live checks

1. Verify Vercel deployment uses the intended `DATABASE_URL` for its respective Neon production database; updated environment values apply to a new deployment, not retroactively to an already-running deployment.
2. Validate production database schema and apply reviewed, non-destructive migrations if needed. At audit time, the Neon databases have **zero tables** on both default and preview branches. Merely setting `DATABASE_URL` is not proof of application readiness.
3. Execute API health checks, create/read study material and attempt/review persistence on a controlled test identity.
4. Test payment/account webhooks and ledger writes separately on InstantPay.
5. Confirm CI `audit:database`, TypeScript checks, unit tests, Web build, Flutter analyze/test and OWASP all succeed.
6. Do not launch until database connectivity and write-read behaviour have been verified in deployed application environments.

## Recovery

If connectivity fails, leave production running unchanged while repairing the Neon secret/scope. Do not downgrade to a local or browser-side database silently. Never commit database passwords or raw connection strings.
