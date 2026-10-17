# InstantStudy ChatGPT plugin — P0 security release gate

Date: 2026-10-13. Status: draft implementation, NOT approved for production or public publication.

## Architecture

- Trusted internal agents keep the existing `/mcp` route with its private bearer key.
- ChatGPT only uses `/mcp/chatgpt` (separate OAuth resource server).
- If OAuth issuer, resource or JWKS URL are missing or non-HTTPS, public plugin HTTP returns 503, not anonymous access.
- `/.well-known/oauth-protected-resource` enables authorization discovery when configured.
- JWT must have a valid trusted signature, issuer, exact audience, expiry, both study scopes, and signed `instantstudy_learner_id`.
- The issuer MUST mint `instantstudy_learner_id` by securely resolving the canonical existing Instant Account user; untrusted client-supplied IDs are never authoritative.
- Public tool operations are scoped to that account. All session actions check owner, even when a UUID is known.
- Public ChatGPT tool list excludes global Anki bridge operations and Adapty subscription marketing. No subscriptions/upgrades/checkout in plugin.
- Account is accepted only if the server-side StudyEngine ledger currently reports plus/unlimited. Existing app hard paywall remains separate.
- This does NOT alter the public web/mobile hard paywall.

## Deployment dependencies (NOT completed in this PR)

1. Choose and configure a real OAuth 2.1 authorization server with authorization-code + PKCE S256, a supported client registration mechanism and matching issuer/redirect configuration. Issuer must issue JWT access tokens and publish HTTPS JWKS.
2. Configure production server-only `INSTANTSTUDY_OAUTH_ISSUER`, `INSTANTSTUDY_OAUTH_RESOURCE=https://instantstudy-api.vercel.app`, and `INSTANTSTUDY_OAUTH_JWKS_URL`.
3. Configure signed canonical `instantstudy_learner_id` identity claim. The value must correspond to the existing account, NOT an arbitrary model ID or email address.
4. Verify that Paddle/InstantPay subscription lifecycle, cancellations, family access, refunds, expiration and reactivation update the StudyEngine paid entitlement ledger promptly. This PR intentionally does not claim that synchronization is already proven.
5. Confirm OAuth discovery, JWT authorization and actual persisted Neon sessions on deployed staging, not just unit tests.
6. Verify authorization for two paid accounts, one unsubscribed account and malicious attempts using another account's learner ID or session UUID.
7. Test ChatGPT login, account profile/account-linking and tool calls end to end; test expired/revoked tokens. Add a revocation or short token lifetime policy appropriate for the OAuth issuer.
8. Review eventual branch integrations (hardwall, Quizlet, Neon, Apple), migration staging, GitHub CI and Vercel build limits before merging.
9. Review privacy/retention, MCP file download permissions, cost/abuse ceilings, and account deletion before public submission.

## Automated gates

`npm run typecheck` and `npm test` include:
- OAuth metadata and fail-closed deployment config checks.
- Signed JWT verification, audience, issuer, scopes and stable account binding.
- Cross-account learner-ID rejection and explicit paid entitlement requirement.

Green CI is necessary but not sufficient: no live OAuth credentials, deployed endpoint authorization, real user purchase or ChatGPT registration was tested by these unit tests.

## Product and policy decisions

- Existing paid users may use their InstantStudy entitlement after account linking.
- No selling digital subscriptions, promotions or checkout flow inside ChatGPT.
- No shared Anki device in public plugin; account-specific pairing requires a separate future design.
- No ability to bypass an active subscription by omitting learnerId in public plugin.
- Original prototype PR #34 targets an older branch. This independent draft targets current `main` and carries forward only the portable manifest and skills.

References:
- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/build/plugins
- https://developers.openai.com/plugins/plugin-guidelines
