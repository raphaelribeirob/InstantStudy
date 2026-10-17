---
name: setup
description: Configure and verify the private InstantStudy OAuth study plugin.
---

# InstantStudy — ChatGPT setup

The ChatGPT plugin entry is `https://instantstudy-api.vercel.app/mcp/chatgpt`, **not** the legacy `/mcp` route. ChatGPT linking only works when the issuer, resource audience, verified account claim, and paid entitlement synchronization are genuinely configured.

1. Configure Auth0 using the [InstantStudy Auth0 setup guide](https://github.com/raphaelribeirob/InstantStudy/blob/fix/instantstudy-chatgpt-mcp-p0-20261013/docs/AUTH0_MCP_SETUP.md) for OAuth 2.1 authorization code + PKCE S256 and DCR. Verify API scopes, default client grants, and Resource Parameter Compatibility Profile before enabling. Check its discovery metadata and that it accepts ChatGPT's supported client registration mode.
2. Provision server-only values `INSTANTSTUDY_OAUTH_ISSUER`, `INSTANTSTUDY_OAUTH_RESOURCE`, and `INSTANTSTUDY_OAUTH_JWKS_URL`. The provider must mint a signed namespaced `https://instantstudy-api.vercel.app/learner_id` claim from trusted Auth0 `app_metadata.instantstudy_learner_id` that maps to the correct existing InstantStudy/InstantPay account and must issue tokens with audience equal to the resource and scopes `study:read study:write`.
3. Verify `/.well-known/oauth-protected-resource`, OAuth 401 challenge, issuer, JWT signature, audience, scopes, expiry, and two-user cross-account isolation.
4. The server requires an existing `plus` or `unlimited` entitlement from the StudyEngine database before allowing tool use. Verify live payment lifecycle synchronization and revocations before publishing. The plugin must never show plans, payment links, offers, or upgrades.
5. The multi-user ChatGPT route never exposes the global Anki device bridge. Add user-scoped pairing before considering separate Anki tools.
6. Run end-to-end PDF/notes → prepare → next → answer → finish → persistent due reviews, with two paid users and one unpaid user, before publishing.
7. This source package is not an installed or approved ChatGPT plugin; owner must complete account linking, external credentials, app submission, and review.

Keep the legacy private `/mcp` route for trusted development/Codex clients with environment-injected bearer tokens. Never publish those credentials.
