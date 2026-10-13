# NEON_SCALABILITY_PHASE2.md — Managed Schema + Isolation + Lean Library

> **InstantStudy™ · 2026-10-13 · PR #56 · Draft / NOT production-certified.**
>
> Scope: GitHub code changes only. No Neon project, database branch, schema, data, secrets, Vercel deployment or external provider was changed. The [original audit](NEON_SCALABILITY.md) and [Phase 1 release plan](NEON_SCALABILITY_IMPLEMENTATION.md) remain the reference for prerequisites.

## 1. Applied in Phase 2

| Area | Implementation | Verified by | State |
|---|---|---|---|
| DDL at runtime — Study | `INSTANTSTUDY_SCHEMA_MANAGED=true` opts nine Neon modules out of `CREATE TABLE/INDEX`. Flag defaults OFF for compatibility with legacy installations. | GitHub CI static gate | Implemented in code, deployment flag OFF |
| DDL at runtime — Pay | `INSTANTPAY_SCHEMA_MANAGED=true` opts the InstantPay webhook/database adapter out of schema creation. | Source audit gate | Implemented in code, flag OFF |
| Session isolation | `StudyPersistence.getOwned(sessionId, learnerId)` performs an owner-filtered SQL lookup; StudyEngine checks in-memory cache ownership too. | Unit regression | Implemented in paid API authorization path |
| Lightweight library | `listSummaries()` performs title-filtered keyset pagination, returns only owner-scoped metadata, excludes `content` and `assets_json`. Limit 50, stable `(updated_at, id)` cursor. | Unit regression + TypeScript | New additive route; old library API remains for backwards compatibility |
| Web BFF | `material_list_summary` validates learner identity server-side and forwards bounded cursor/query. | CI + route review | Implemented |
| Client | `listStudyMaterialSummaries()` exposes lean list without changing existing full-library UI, preventing a breaking UX migration. | Web typecheck | Implemented, UI adoption pending |
| Offline code gate | `audit:neon-scale` checks managed-schema wiring, owner-scoped persistence, BFF endpoint, pagination and tests. | GitHub Actions | Implemented |

### Behavior of the managed-schema flags

* **False/missing (current default):** existing runtime schema creation remains for compatibility. This is transitional; does not meet the final least-privilege production architecture.
* **True:** runtime code skips schema creation; it assumes dedicated migrations already created the tables. Missing schema causes the application to fail rather than silently modify the database.
* **Do not enable either flag on production** without verifying the corresponding migration state and DB role permissions first. Study and Pay use **separate environment variables and separate Neon databases**.
* A static check **does not prove** the deployed server actually uses a least-privilege role. That requires Neon permission inspection and an integration test.

## 2. Preview-only activation sequence

1. Confirm PR dependencies: [#55](https://github.com/raphaelribeirob/InstantStudy/pull/55) is the base of this PR. No blind merge with earlier product/UX PRs.
2. In an **authorized, disposable Neon preview** with synthetic/anonymized data, compare the live schema with `database/migrations/0001..0005` and `apps/pay/migrations/0000..20261012`. Study and Pay must be verified separately.
3. Apply only missing migrations with a **dedicated migration role** through an independently reviewed migration process; do not run migrations from a request handler.
4. Run **read-only** verification using `npm run audit:neon-live` for Study, `npm run audit:pay-schema-live` for Pay. Compare owner and quota rules and ensure the indexed FSRS backfill from Phase 1 is accurate.
5. Turn on `INSTANTSTUDY_SCHEMA_MANAGED=true` and `INSTANTPAY_SCHEMA_MANAGED=true` **only in their appropriate preview services**, then run Web/API/Flutter E2E, Paddle replay and database rights tests.
6. Check that the runtime role cannot `CREATE`, `ALTER`, `DROP`, or select another learner's private study materials. The owner SQL predicate is defense in depth, **not full RLS**.
7. Validate library pages with 10k+ synthetic materials, mixed owners, same timestamps, UTF-8 titles, and concurrent edits. Pagination and sorting should remain predictable.
8. Only after rollback rehearsal and independent signoff, plan a controlled, reversible production release.

## 3. Still open (do not call Neon 100% scalable)

| Critical gap | Why not solved by this PR | Required next change |
|---|---|---|
| Runtime DDL disabled by default | Environment compatibility: migrations have not been applied in Neon from GitHub work | Use real managed migration runner/permissions and enable flags in approved deployment |
| Usage quota request-id idempotency | Quotas are atomically bounded in PR #55, but repeated retries can still consume multiple rounds | Bind an authenticated idempotency key to a **persisted study session result**, not merely to a quota counter; test replay/races |
| Webhook exactly-once materialization | Retry and claim leases exist; inbox and entitlement updates are not yet one DB transaction | Single transactional application or outbox, replay audit and Paddle sandbox fault injection |
| Database RLS + least-privilege roles | Only verified server/BFF identity and scoped SQL have been implemented | Plan policies and roles; test in preview with two user accounts before activating policies |
| Optimistic session concurrency | `session_json` updates can overwrite another server's changes | `revision`/CAS persistence and immutable attempt IDs in schema+Study Engine |
| Full library optimization | Existing `listStudyMaterials` API still loads source content/assets for UI compatibility | Migrate UI to summaries + on-demand `getStudyMaterial` with proper loading states and A/B test |
| Binary storage | Large audio chunks remain Base64 in Neon | Safe private object storage migration with signed access/TTL, retention and consent |
| Family seating | Family member COUNT + INSERT can race | DB transaction/advisory lock or serialized provider membership updates |
| Index performance & cost | No access to live Neon load metrics | EXPLAIN ANALYZE with synthetic data, P95 latency, SLO, concurrency, backup/PITR drills |
| 48/48 Quizlet offer | Separate product-release contract | Execute full functional evidence and acceptance manifest |

## 4. Exact commands and safety conditions

```bash
# Local/offline static gates; do not connect to Neon
npm run audit:database
npm run audit:neon-scale
npm run typecheck
npm test
npm run build

# READ ONLY, against the designated PREVIEW databases after migrations
npm run audit:neon-live       # DATABASE_URL = Study preview
npm run audit:pay-schema-live # DATABASE_URL = InstantPay preview

# Under explicit preview authorization ONLY
npm run backfill:neon:preview # default dry run; no DB access
```

**Expected release decision:** `NOT_CERTIFIED`. The PR is a deployable code candidate, not proof that managed roles, RLS, billing and indexed queries are configured correctly. No production schema or data was accessed or modified.
