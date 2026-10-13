# Install InstantStudy plugin (development package)

Status: **package available for local testing**, not connected to an Auth0 tenant and not submitted to the public plugin directory. The ChatGPT MCP endpoint `https://instantstudy-api.vercel.app/mcp/chatgpt` is not yet live with valid OAuth credentials. Installing this package **does not** make the study tools work until the server is configured, deployed, and account-linked.

## Option A — ChatGPT web ZIP upload (when enabled by workspace permissions)

1. Get `InstantStudy-Plugin-Dev-0.1.0.zip` exported for this branch.
2. On ChatGPT web, go to **Admin console → [workspace] → Plugins → Add → Upload plugin** if your workspace and role have this feature.
3. Install the uploaded plugin if prompted and configure its connection. A server/auth error is expected before staging OAuth is configured.
4. Run `@InstantStudy` in ChatGPT Work **after** the server passes OAuth E2E. Local installation is not public listing or app-store approval.

Do not submit this candidate ZIP for public review until `npm run plugin:release-check` and all live release gates pass.

## Option B — Repo marketplace (ChatGPT desktop or Codex)

The file `.agents/plugins/marketplace.json` in this branch exposes `instantstudy@instantstudy-dev`. From a terminal on your **own trusted computer** with Codex CLI and Git access:

```sh
codex plugin marketplace add raphaelribeirob/InstantStudy --ref fix/instantstudy-chatgpt-mcp-p0-20261013
codex plugin marketplace list
```

Open the ChatGPT desktop app → Plugins Directory → select **InstantStudy — Development** → install `InstantStudy`. Restart if the source is not yet reflected. You can also use the Codex client marketplace workflow where supported.

**This CLI step modifies the machine where it runs, not the user's iPhone or ChatGPT account from this chat.** Nothing installed into this conversation's ChatGPT by committing the repo file.

## Option C — connect the MCP server directly for testing

In ChatGPT Plugins → + → Add custom MCP server, use `https://instantstudy-api.vercel.app/mcp/chatgpt` and the intended OAuth authentication. Select **Create as a plugin** after a successful connection. This is **blocked until** Auth0 is configured and the new server route is deployed.

## Launch blockers

- Configure Auth0 OAuth 2.1 DCR, authorization code + PKCE S256, resource audience, callback and HTTPS JWKS.
- Link Auth0 account to existing InstantStudy accounts using a **trusted** account binding and verify server-side paid entitlement status.
- Deploy tested branch in a safe preview environment, run cross-account and paid access tests.
- Add valid privacy/terms/support URLs, demo/reviewer access, domain verification, and obtain OpenAI approval.

Setup guide: [AUTH0_MCP_SETUP.md](AUTH0_MCP_SETUP.md)

References:
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://developers.openai.com/plugins/build/plugins
- https://help.openai.com/en/articles/20001256-plugins-in-chatgpt
