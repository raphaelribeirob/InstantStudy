# NEON_SCALABILITY_IMPLEMENTATION.md — InstantStudy

> **Implemented code in draft PR #55; NOT rolled out or certified**  
> Audit specification: [NEON_SCALABILITY.md](NEON_SCALABILITY.md).  
> Environment scope: GitHub only. **No Neon branch, migration, data, Vercel env, billing or production changes were performed.**
>
> **IMPORTANT: do not merge/deploy the new Paddle webhook implementation before the matching InstantPay schema migration has been applied and tested on preview.** The migrated inbox columns are required by the new queries.

## Implemented in the PR

| Workstream | State | Files | Reality / limits |
|---|---|---|---|
| Atomic Learn/Test quota | Implemented in code | `apps/mcp-server/src/entitlements.ts` | Conditional `INSERT..ON CONFLICT..UPDATE` bounds concurrent quota against stored plan. **Not request-id idempotent yet**; repeated distinct requests may each consume one round |
| Quota race regressions | Automated test | `apps/mcp-server/src/neonScalability.test.ts` | 50 concurrent calls on memory adapter; actual Postgres concurrency needs an integration/load test |
| Paddle webhook retry | Implemented in code | `apps/pay/api/_db.js`, `webhook.js`, `webhookLifecycle.js` | Claimed/failed/applied states with lease token, replay after failure, 503 while in-flight; not fully atomic inbox+effect transaction |
| Subscription event ordering | Implemented in code | `_db.js`, new migration | Provider occurrence timestamp guards stale event state overwrites when a row already exists. Cross-identity / missing subscription cases need sandbox reconciliation |
| Webhook failure tests | Automated test | `webhookLifecycle.test.js` | Confirms failed delivery retry, in-progress duplicate, unmatched cancellation, transaction not creating entitlement |
| Versioned schema proposals | Files created, **not applied** | `database/migrations/0004_concept_progress.sql`, `0005_flashcard_progress.sql`, `apps/pay/migrations/0000_core_billing.sql`, `20261012_billing_inbox.sql` | Study & Pay are **separate Neon databases**. Existing historical migrations were retained for compatibility |
| Indexed FSRS review | Implemented behind feature switch, off | `studyPersistence.ts` | HTTP Neon atomic batch writes session + normalized concept progress; indexed due queries and prior concept lookup only with `INSTANTSTUDY_INDEXED_REVIEW_ENABLED=true` |
| Historical FSRS backfill | Guarded script, **not executed** | `scripts/backfill-neon-progress.mjs` | Keyset batches in PREVIEW only, checked migration precondition; must verify counts before activation |
| Database audits | GitHub CI/static + read-only scripts | `scripts/check-neon-scale.mjs`, `verify-neon-schema.mjs`, `verify-pay-schema.mjs` | Static audit does not prove live schema; live gates require separate server-only credentials and permission |

## Required rollout order (no shortcuts)

### A. Branch and secrets isolation

1. Verify InstantStudy Neon and InstantPay Neon **are different projects/databases**.
2. Create separate, *explicitly authorized*, disposable preview branches using sanitized/synthetic data (Neon Console/integration with operator approval).
3. Provide separate DB credentials as encrypted CI/operator secrets, never a browser `VITE_*` variable or commit.
4. Snapshot/schema-check current DB. Confirm roles, PII boundaries, billing customer state and version of running API; **do not modify production**.

### B. Apply schema in dedicated preview ONLY

- **Study**: inspect `database/migrations/0001`, `0002`, `0003`, `0004`, `0005` in order, applying **only unapplied migrations**. Do not run duplicate `db/migrations` baseline. Existing databases may already have some tables/indexes from app runtime DDL; compare schemas and validate constraints first.
- **InstantPay**: baseline `apps/pay/migrations/0000_core_billing.sql` only for a new DB; existing projects skip/compare it. Then apply `apps/pay/migrations/20261012_billing_inbox.sql` under DBA review.
- **Migration note**: the inbox migration drops the `NOT NULL` requirement on `billing_events.processed_at`. This is necessary so a claimed-but-unapplied event is distinguishable from a successfully committed entitlement.
- Migration `ADD CONSTRAINT` is versioned, not an arbitrarily rerunnable SQL snippet; track checksum/date/operator. Dedicated migration runner and removal of all runtime DDL **remain pending**.
- Run `npm run audit:neon-live` against **Study** preview, and `npm run audit:pay-schema-live` against **Pay** preview (separate `DATABASE_URL`).

### C. Backfill, compare, enable

1. Default dry run: `npm run backfill:neon:preview` — makes **no DB connection**.
2. Only in explicitly authorized, disposable **Study preview**, set `INSTANTSTUDY_NEON_PREVIEW_CONFIRMED=yes` and `INSTANTSTUDY_BACKFILL_APPROVED=yes`, then `node scripts/backfill-neon-progress.mjs --apply` with preview `DATABASE_URL`.
3. Compare old/new concept progress counts for >100 historical sessions, FSRS due times, ownership, missing items, and repeated labels. Verify that a transaction failure rolls back **both** the session save and index.
4. Then set `INSTANTSTUDY_INDEXED_REVIEW_ENABLED=true` **only in this preview environment**. Verify no regressions in Learn, Review, AHA and material deletion.
5. Backfill is idempotent for repeated execution; the read flag **must remain off in production** until operators sign off on data equivalence.

### D. Payment and concurrency fault injection

- Parallel Learn Test at +1 limit and subscription plan downgrade/upgrade; ensure no overuse at 20/3 limits, plus test retries and duplicate request IDs.
- Signed Paddle events: fail after claim and before entitlement, replay, event in processing state, orphan cancellation before creation, old after new, refund, canceled, missing identity, chargeback. Confirm **every event converges to the correct entitlement** and no cancellation reactivates unintentionally.
- Check no payloads with secrets in logs/analytics, check lease expiry and claim token reassignment.
- Reconcile billing state against provider API for historical webhook deliveries after any migration.
- Do not claim this PR provides exactly-once distributed delivery. It is an **at-least-once/replayable** first step.

### E. Production eligibility

Only after the preview checks, add a reviewed schema migration process, DB owner-scoped read/write, RLS/least-privilege role plan, backups and PITR restore evidence, load tests, latency P95, quota idempotency and deployment/rollback plan. Then obtain independent release approval.

## Work remaining from the original 14-risk audit

- **P0 open:** eliminate runtime schema DDL across all services; enforce versioned schema migrations and least-privilege roles; owner-scoped `StudyPersistence.get` and optimistic versioning; fully transactional payment inbox + entitlement materialization and request-key idempotent quota.
- **P1 open:** optimize material library payload and keyset pagination; move base64 audio/PDF blobs to private object storage; background upload cleanup; foreign key and RLS deployment; index search queries based on actual explain plans; family seat count atomicity.
- **Operations open:** preview scale/load with real-size synthetic data, index bloat/cost monitoring, autoscaling sizing and PITR restore rehearsals.

## Verification commands

```bash
npm run audit:database
npm run audit:neon-scale
npm run typecheck
npm test
npm run build
npm run security:audit
npm run audit:neon-live          # read-only; STUDY preview DATABASE_URL required
npm run audit:pay-schema-live    # read-only; PAY preview DATABASE_URL required
npm run backfill:neon:preview    # offline/no DB unless --apply + preview approval
```

**Acceptance state:** Code and unit tests may pass, but **Neon scalability = NOT CERTIFIED** without direct preview concurrency, migration, data-correctness, and failure-recovery evidence. `audit:release` remains the definitive release gate and still fails until full product acceptance.
