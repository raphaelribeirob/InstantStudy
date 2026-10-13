# Instant Cloud — shared cross-product progress API

**Stage: implementation PR, not deployed.** This reusable service coordinates
`InstantStudy`, `InstantSpeak`, `InstantBible`, and future products while
preserving each product's private databases and hard paywall.

The service uses a dedicated Neon database (provision separately) and accepts
OAuth **access tokens**, not ID tokens or ChatGPT model-generated IDs. All account
keys come from the validated Auth0 `iss` + `sub` pair. A user logging into all
three clients with the *same Auth0 tenant and account* sees the same aggregate
progress; the application can read each product's full activity only from that
product's own authenticated API.

## API

| Route | Scope | Description |
|---|---|---|
| `GET /health` | none | Liveness only |
| `GET /health/ready` | none | Database connectivity |
| `GET /v1/me` | `cloud:read` | Pseudonymous Instant account ID |
| `GET /v1/progress` | `cloud:read` | Counts, elapsed time, last activity per product |
| `GET /v1/progress/events?product=instant_study&afterId=UUID&limit=50` | `cloud:read` | Cursor-based synchronization |
| `POST /v1/progress/events` | `cloud:write` | Idempotent, minimal non-sensitive progress events |

Sample:
```json
{
  "eventId": "4c31cee7-d66a-45f1-84de-89d140862cb2",
  "product": "instant_study",
  "kind": "session_completed",
  "occurredAt": "2026-10-13T17:00:00Z",
  "sourceId": "study-session-5",
  "metrics": { "durationSeconds": 420, "score": 0.86 }
}
```

The caller cannot choose `userId`. It comes from a signed, issuer-and-audience
verified OAuth access token. Event payloads prohibit raw content and unknown
properties. Reusing `eventId` with identical data is a no-op; with different
data it is HTTP 409. Data belonging to other users is neither returned nor
accepted through cursor parameters.

## Local tests

```bash
npm install
npm --workspace @instant/cloud-api test
```

## Deploy prerequisites (not completed)

1. Provision a **dedicated Neon development database** with least-privilege
   credentials. Apply `database/migrations/0001_instant_cloud.sql` after schema review.
2. Set `INSTANT_CLOUD_DATABASE_URL`, `INSTANT_CLOUD_OAUTH_ISSUER` (exact Auth0
   `iss`, including trailing slash) and `INSTANT_CLOUD_OAUTH_AUDIENCE`
   (the exact Auth0 API identifier) on a private **preview deployment**.
3. Configure Auth0 scopes `cloud:read`, `cloud:write`, and Authorization Code
   + PKCE for native/web users. Reuse the same identity issuer across products.
4. Build an explicit server-side identity migration linking existing
   Firebase/anonymous/Neon product IDs to the Instant ID, requiring verification
   of ownership of both accounts. **Never link solely by matching email.**
5. Start event producers from each product only after successful account
   linking. **Do not** upload private journal entries, voice transcripts,
   study documents, or Bible prayer content into Instant Cloud.
6. Implement a read-only, server-verified entitlement bridge to InstantPay,
   with signed subject mapping, billing event revocation and bundle rules.
   Until this is live, keep independent hard paywalls; the progress service
   must not grant paid product features.
7. Validate token revocation/refresh, offline sync, duplicate event replay,
   cross-account isolation, migration compatibility and product-specific
   privacy consents. Add actual Neon RLS/least-privileged database role
   before public multi-tenant release.
8. Do not infer a future product subscription or access rights from aggregate
   progress records; there is no access API in V1.

See `docs/INSTANT_CLOUD_ECOSYSTEM.md` at repository root for the cross-app plan.
