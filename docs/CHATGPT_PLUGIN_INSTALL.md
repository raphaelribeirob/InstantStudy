# InstantStudy: Plugin package and ChatGPT installation status

**Status: package prepared; ChatGPT account installation and public release NOT complete.**

## Repository paths

- `plugins/instantstudy/plugin.json`: portable Agent Plugins manifest.
- `plugins/instantstudy/mcp.json`: remote Streamable HTTP MCP entry (current fixed-bearer development mode).
- `plugins/instantstudy/skills/setup/SKILL.md`: connection/launch checks.
- `plugins/instantstudy/skills/study/SKILL.md`: evidence-grounded adaptive study loop.
- API implementation: `apps/mcp-server/src/server.ts`.
- Standalone user interfaces: `apps/web/`, `apps/flutter_app/`. Their Orb design and Neon-backed Study Engine remain separate from plugin packaging.

The backend deployment is associated with Vercel project `instantstudy-api`. The stable project domain is `https://instantstudy-api.vercel.app`, and the intended MCP URL is `https://instantstudy-api.vercel.app/mcp`. **DNS/domain membership is not proof that the endpoint or connection works.** Verify it from the intended runtime before registering.

## Current authentication: why ChatGPT installation remains blocked

Existing `/mcp` accepts a private shared bearer token (`INSTANTSTUDY_MCP_API_KEY`). The portable MCP manifest declares `auth.type = api_key` with `headerScheme = bearer` to describe the *real* current implementation.

This is suitable for trusted MCP clients able to inject the header privately, **not for public, multi-user ChatGPT installation**. As of October 2026, the ChatGPT custom MCP/plugin connection interface and submission portal do not accept API-key/bearer credential entry. They support no-auth and OAuth (and mixed). **Never** change `auth.type` to `none` just to make the portal accept it. Never publish/share the key, bake it into a manifest, browser bundle, or URL query.

## Required production OAuth migration

Before selecting ChatGPT Plugins -> Add custom MCP server:

1. Choose an OAuth 2.1 authorization server integrating with the actual InstantStudy account identity (not simply a payment subscriber ID).
2. Implement authorization-code + PKCE (S256), required metadata discovery, issuer, audience/resource, expiry, scopes, and token checks for every MCP request. Implement `/.well-known/oauth-protected-resource` and corresponding 401 `WWW-Authenticate` challenges.
3. Define `securitySchemes` on each tool. A token must map server-side to an immutable authenticated `learnerId`. Tool-provided `learnerId` must never select someone else's data. Validate session ownership on read, next, answer, and finish operations.
4. Keep the existing privileged REST admin key separate; verify user entitlements on the server. Never trust `billingPlan` supplied by the model.
5. Remove or isolate the global Anki device bridge from multi-user plugin access until device pairing and authorization are account-scoped.
6. Enforce session isolation, document permissions, request size limits, SSRF controls for document URLs, rate limits, audit logging, account unlink/revocation, and privacy policy/disclosures.
7. Change `plugins/instantstudy/mcp.json` from `api_key` to `oauth` **only when** the OAuth server is live and registration/discovery is working.
8. Confirm deployment/Neon health, then register the MCP URL under ChatGPT -> Plugins -> Add custom MCP server. Complete OAuth login and install the created personal plugin. Run a real learner E2E session.
9. Submit the portable plugin package through the plugin submission process only after automated security and review checks pass.

## Installation checks

| Acceptance criterion | Current status |
| --- | --- |
| Existing backend exposes the `/mcp` route | Code verified |
| Same Study Engine serves app and MCP | Code verified |
| Portable manifest and study/setup skills | Packaged in this branch |
| Stable HTTPS endpoint responds | Not independently verified |
| Neon ready on target deployment | Not independently verified |
| OAuth account linking and per-user scoping | Not implemented |
| ChatGPT personal plugin installed | Not done |
| Plugin approved for public directory | Not submitted |

### Trusted MCP clients (not ChatGPT UI)

With an authorized private environment variable, a compatible client can connect to the current endpoint, e.g. Codex:

```toml
[mcp_servers.instantstudy]
url = "https://instantstudy-api.vercel.app/mcp"
bearer_token_env_var = "INSTANTSTUDY_MCP_API_KEY"
```

Do not paste credentials into chat or version-control. The backend may be deployed from a non-default development branch; select and test the intended Vercel environment before use.

## Official documentation

- https://developers.openai.com/plugins/build/plugins
- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/quickstart
- https://developers.openai.com/plugins/deploy/submission
