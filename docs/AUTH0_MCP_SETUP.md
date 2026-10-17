# InstantStudy Plugin — Auth0 setup (staging first)

**Status: configuration instructions, NOT an Auth0 tenant connection.** The repo cannot authenticate against an Auth0 tenant until the owner creates/configures one. Never paste tenant secrets or API credentials into GitHub or ChatGPT messages.

## Configuration architecture

| Component | Value |
|---|---|
| MCP entrypoint | `https://instantstudy-api.vercel.app/mcp/chatgpt` (production URL reserved, do not deploy yet) |
| OAuth resource identifier / Auth0 API Identifier | `https://instantstudy-api.vercel.app` |
| Protected resource metadata | `https://instantstudy-api.vercel.app/.well-known/oauth-protected-resource` |
| Access token format | JWT, asymmetric RS256 via Auth0 JWKS |
| Issuer | `https://YOUR_AUTH0_DOMAIN/` (MUST include exact trailing slash in JWT validation) |
| JWKS | `https://YOUR_AUTH0_DOMAIN/.well-known/jwks.json` |
| Permissions | `study:read` and `study:write` |
| Canonical identity claim | `https://instantstudy-api.vercel.app/learner_id` |
| OAuth registration | DCR (`mcp.json`); requires Auth0 tenant feature and client grants |
| Callback | Supplied by ChatGPT plugin management UI, do not guess |

**Use the actual Auth0 tenant domain, preferably a custom verified domain if you have one.** The final issuer value must exactly match the token `iss`, including trailing slash, even if dashboard displays a hostname without slash. Do not point OAuth at Neon Auth; Neon remains the persistence layer.

## Setup in the Auth0 Dashboard (admin action)

1. Create a tenant dedicated to InstantStudy if you do not already operate a compatible existing tenant; configure trusted login connections.
2. Under **Applications → APIs**, create an API called **InstantStudy MCP** with Identifier **`https://instantstudy-api.vercel.app`**, signing algorithm **RS256**, and define `study:read` / `study:write` permissions. Ensure ChatGPT's `resource` matches the identifier verbatim.
3. Under **Settings → Advanced**, enable the **Resource Parameter Compatibility Profile**. Without it, ChatGPT's RFC8707 `resource` value may not become the JWT `aud`; Auth0 can issue tokens for `/userinfo` and ChatGPT linking fails.
4. Enable **Dynamic Client Registration** (**DCR**) if you choose to use the package's `client.mode=dcr`. DCR on Auth0 is an open registration endpoint (`/oidc/register`). Restrict access with tenant ACL when appropriate, configure baseline API access for third-party applications and user consent explicitly. Default client grants to this API/scopes are required for newly registered third-party clients; audit the scope blast radius. DCR clients use authorization code + PKCE, not client credentials.
5. Discover `https://YOUR_AUTH0_DOMAIN/.well-known/openid-configuration`. Confirm the exact issuer with trailing slash, authorization and token endpoints, JWKS URI, registration endpoint, and **`code_challenge_methods_supported` containing `S256`**. Confirm `token_endpoint_auth_methods_supported` includes a compatible method such as `none` for DCR public clients. If Auth0 metadata is missing a required value, resolve Auth0 configuration first; do not falsely advertise support from the InstantStudy API.
6. Create an **Actions → Post Login** Action by copying `integrations/auth0/instantstudy-post-login.cjs`. Add a secret `INSTANTSTUDY_MCP_AUDIENCE=https://instantstudy-api.vercel.app`; deploy, drag into Login Flow, apply. This Action only adds the learner claim for the InstantStudy API audience.
7. Link each verified Auth0 user to their **existing InstantStudy billing/learning account**, server-side, by setting protected `app_metadata.instantstudy_learner_id` with the Auth0 Management API. This must be done by a trusted account-linking service that verifies BOTH identities; do not derive it from public user_metadata, email text, LLM prompts, or arbitrary API parameters. **No account-linking implementation or active tenant was provisioned in this PR.** Until linked, the Action denies access to InstantStudy's API.
8. Configure the Vercel `instantstudy-api` **preview/staging** environment using server-only variables:
   - `INSTANTSTUDY_OAUTH_ISSUER=https://YOUR_AUTH0_DOMAIN/`
   - `INSTANTSTUDY_OAUTH_RESOURCE=https://instantstudy-api.vercel.app`
   - `INSTANTSTUDY_OAUTH_JWKS_URL=https://YOUR_AUTH0_DOMAIN/.well-known/jwks.json`
   - `INSTANTSTUDY_OAUTH_LEARNER_CLAIM=https://instantstudy-api.vercel.app/learner_id`
   Production is deliberately left untouched.
9. Run `npm run auth0:check` with the corresponding `INSTANTSTUDY_OAUTH_*` env values set; inspect the protected-resource metadata, JWT positive/negative tests, actual DCR + consent + callback + code exchange with the connected ChatGPT account. Do not confuse a metadata-only check with an OAuth E2E test.
10. Verify entitlement synchronization: `studyEntitlements` and **billing source of truth** must agree for paid active, canceled, expired, refunded, grace period, and nonpaying users. The hard paywall remains enforced server-side.
11. Test second paid account, inactive account and same-session cross-account write attempts. Verify no global Anki bridge tools or price/upgrade tools are available at `/mcp/chatgpt`.
12. Complete support, privacy, terms, reviewer credentials (through secure dashboard form), domain verification and plugin review; do not publish until all release gates pass.

## Security notes

- **Never** put a shared `INSTANTSTUDY_MCP_API_KEY` in public plugin ZIP or Auth0 third-party client.
- Require JWT signature, exact `iss`, `aud`, `exp`, OAuth scopes, and the namespaced immutable learner claim. All study tools must revalidate account ownership.
- Use short token expiry, sensible refresh/revocation behavior, rate limits and review the risks of giving default access to any Auth0 DCR third-party clients.
- The **standalone InstantStudy app** has its own login and paid billing model. Successful ChatGPT OAuth login does not prove billing mapping until actual account linking is done.
- Any usage of `INSTANTSTUDY_OAUTH_RESOURCE` other than the exact Auth0 API Identifier will fail by design. In particular, a preview deployment hostname cannot replace the shared OAuth audience without a matching separate Auth0 API/claim/issuer setup.
- The Auth0 Action code's presence in GitHub does not automatically install it in Auth0.

Sources:
- https://developers.openai.com/plugins/build/auth
- https://auth0.com/docs/get-started/applications/dynamic-client-registration
- https://support.auth0.com/center/s/article/mcp-audience-error-with-auth0
- https://support.auth0.com/center/s/article/adding-custom-claims-to-tokens
