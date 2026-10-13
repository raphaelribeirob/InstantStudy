# Instant Cloud: interoperable multi-product ecosystem

> 2026-10-13 — First executable core, **NOT RELEASED**.
> Product-specific local and remote storage remains authoritative. The new
> service stores only explicit, consented, compact progress metadata.

## Why the current apps need an adapter

| App | Current state | Safe transition |
|---|---|---|
| InstantStudy | Standalone Neon learner IDs, paid entitlements, draft OAuth plugin PR #57 | Resolve a verified `instant_id` ↔ study learner ID mapping, then emit only completion/review events |
| InstantSpeak | Firebase anonymous/Google/Apple accounts, offline progress model, existing cloud merge logic | Link authenticated Firebase user to Auth0 via **proof of control**, preserve existing progress, then emit progress events from the active session |
| InstantBible | Offline Flutter local database, sensitive journals, dormant Neon Data API | Enable optional **non-sensitive event sync** only after explicit user consent; never upload journals/prayers through Instant Cloud |
| InstantPay | Existing Paddle `billing_entitlements`, package `instant_one.all` and family rules | Read access using **verified identities** through a dedicated trusted server-to-server boundary; no direct database sharing |

## Architecture

```text
                      AUTH0 (one identity issuer)
                                 |
  +--------------+---------------+----------------+
  |              |               |                |
iOS Speak       iOS Bible       Study app       ChatGPT plugins
  |              |               |                |
  +--------------+---------------+----------------+
                                 |
                 Instant Cloud API (OAuth)
                   /v1/me  /v1/progress
                                 |
                     Neon progress database
                  minimal, deduplicated events
                                 |
                       Instant Progress UI
                (planned, not yet implemented)

  Separate authoritative product DBs/services:
    Speak progress | Study sessions | Bible journeys | InstantPay billing
```

## Fundamental decisions

1. **One Auth0 account**, not one shared database and not automatic e-mail merges.
2. **Progress** is event-based and idempotent. The first release summarizes product
   counts, durations and last activity; it does not convert scores from unrelated
   products into one misleading universal mastery score.
3. **Private data** stays inside product-specific access controls. Bible journal
   entries, study source documents, and speech audio/transcriptions MUST NOT be
   inserted into Instant Cloud.
4. **Separate billing source of truth**. Cloud event history cannot authorize paid
   features. Bundle subscription is resolved by InstantPay and revocation must
   propagate; existing hard paywalls stay enabled.
5. **Verified migration of old accounts**. Existing Firebase account,
   learner ID and Neon `user_id` must never be linked to an Auth0 subject
   solely by matching email; require proof of control of both identities.
6. **No client-supplied owner ID**. The Cloud API derives stable
   pseudonymous user IDs from signed Auth0 `iss` and `sub`. All Neon
   queries are scoped to that identity; production must use least-privilege
   credentials and defense-in-depth RLS.
7. **Offline-first**. Devices can queue safe event identifiers and replay them;
   duplicate events are ignored, conflicting payloads are rejected.
8. **Same source of truth across surfaces**. A ChatGPT plugin and a native app
   use the same underlying per-product DB through authenticated product APIs.
   Instant Cloud aggregates progress but does not duplicate full session data.

## Delivery stages

**V0 — implemented in draft PR:** Identity verification, /me, progress
event append, deduplication, summary and cursor sync endpoints; tests; Neon
migration *file* without applying it.

**V1 — not yet completed:** Provision dedicated Neon preview database; configure
Auth0; verified legacy account linking; payment bridge; product event adapter
opt-in; real multi-user end-to-end tests; row-level least-privilege
administration; legal/consent flows.

**V2 — not yet completed:** Global user dashboard, safe account switching,
family seats and paid bundle `Instant Pass`, consented notifications and
unified subscription settings.

## Acceptance checks (V1)

- Given the same linked user, Study completion in app appears in instant.cloud
  dashboard and in ChatGPT without manual data copy.
- Switching to another linked user shows only their own progress.
- Duplicate offline event replay does not inflate statistics.
- Revoked subscription blocks paid product use on ALL channels.
- An unlinked legacy account cannot read someone else's sessions even if
  email strings match.
- Bible journal and Speak transcripts never enter the shared progress database.
- JWT audience, issuer, expiry and scopes are enforced for all Cloud endpoints.
- Failed database connectivity denies writes; no ephemeral fallback.

**Current result:** V0 built for code review only, **no live account or
subscription synchronization claimed**.
