---
name: setup
description: Configure and verify InstantStudy as a secure MCP study plugin.
---

# InstantStudy setup

InstantStudy uses the same Study Engine as the Web and Flutter apps. Preserve existing learning state, billing decisions, and the orbital app design.

1. Identify the host: Codex/MCP client vs ChatGPT plugin UI. Do not imply that installing this source package registers the connection in the user's ChatGPT account.
2. For Codex or other MCP clients supporting an environment-based bearer token, configure `https://instantstudy-api.vercel.app/mcp` and the **server-side/private** `INSTANTSTUDY_MCP_API_KEY` environment variable. Never print, paste into chat, store in source control, or bundle this key.
3. For ChatGPT: fixed API-key authentication is **not supported in the current ChatGPT custom MCP/plugin connection flow**. Do not switch the existing server to anonymous access. Explain that an identity provider, OAuth 2.1 authorization-code + PKCE, audience/scope validation, and per-learner access enforcement must be deployed first.
4. Confirm the deployed MCP endpoint is reachable, the database is ready (`/health/ready`), that unauthorized requests receive 401, and that MCP initialization plus tool listing work with supported authentication. Do not claim success without these checks.
5. Use a short real-material session to test `prepare_study`, `next_study_question`, `submit_study_answer`, `finish_study_session`, and retrieval after restart.
6. For public plugin distribution, use the OAuth version of `mcp.json` only after the authorization server and token-to-learner identity mapping are actually deployed. Revalidate that one user cannot access another user's sessions, reviews, Anki bridge, or payments.

See `docs/CHATGPT_PLUGIN_INSTALL.md` in the repository for blockers and acceptance criteria.
