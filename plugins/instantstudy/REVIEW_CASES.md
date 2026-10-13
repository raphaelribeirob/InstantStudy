# InstantStudy — submission review cases and release dossier

Status: **NOT SUBMITTED**. Release target: personal authenticated beta first, then public directory after policy, security and customer-support readiness.

## Five positive reviewer tests

1. **Start from pasted notes:** Logged-in paid learner pastes short biology notes and asks to study. Tool `prepare_study` starts a session, asks one source-grounded question, with no mandatory Anki.
2. **Adaptive progression:** Learner answers incompletely. Tool `submit_study_answer` records partial correctness and omitted concepts. The next question adapts, and a follow-up answer adjusts mastery.
3. **Test integrity:** Paid learner selects Test mode. Tool calls record responses; correct solutions are withheld until `finish_study_session`.
4. **Persistent progress:** Paid learner finishes and signs in again in a different conversation. `get_due_reviews` fetches their own retained due concepts from Neon (must be demonstrated with live database).
5. **Multi-account isolation & profile:** Two separately signed-in paid learners can access their own learning sessions. `get_profile` returns stable, distinct identifiers and tool calls never cross profiles.

## Three negative reviewer tests

1. **No/expired/invalid OAuth token:** `/mcp/chatgpt` rejects the request with 401 and appropriate OAuth challenge; does not accept a shared internal MCP key.
2. **Inactive subscription:** Account authenticated with valid OAuth token but no eligible existing InstantStudy entitlement receives access denied (403), without a checkout or upsell.
3. **Attempted cross-account read/write:** Learner A supplies learner B's ID or known session UUID for `get_study_session`, `next_study_question`, `submit_study_answer`, `finish_study_session` and `get_due_reviews`. All must deny without leaking source content, answers, usage or profile.

## Mandatory release evidence

- [ ] Deploy candidate SHA on a permanent **staging** URL and verify TLS, `/health/ready` and actual Neon read/write.
- [ ] OAuth identity provider configured, tested from ChatGPT with client registration mode (CIMD, DCR or provided client), authorization-code + PKCE S256 and correct `resource` audience.
- [ ] Issuer provides immutable verified `instantstudy_learner_id` claim bound to existing account; no anonymous/free bypass.
- [ ] Real paid entitlement sync, cancellations, family seats and expired billing states tested.
- [ ] Source-scoped review reads/writes and token replay/rate limits tested with adversarial cases.
- [ ] Domain verification challenge present and verified on canonical public MCP domain.
- [ ] Developer/business identity verified.
- [ ] Four valid public HTTPS URLs in listing (website/support/privacy/terms) with content reviewed by product owner.
- [ ] Privacy policy accurately discloses study documents, user answers, AI processors, retention, deletion, and account controls.
- [ ] Five positive/three negative cases above executed live and documented; submission test case entries completed.
- [ ] Reviewer demo credentials with representative study data and login without inaccessible 2FA.
- [ ] Demo recording URL demonstrating major flows in ChatGPT/mobile as applicable.
- [ ] Every published MCP tool has accurate readOnlyHint, destructiveHint, openWorldHint and documented justification.
- [ ] Successful live MCP tool scan and repository CI; screenshot rules met if custom UI is introduced.
- [ ] Privacy/terms legal review and policy compliance; no digital subscription sales/upsell inside ChatGPT.
- [ ] Production deployment and feature rollback plan approved.
- [ ] Directory submission approved by OpenAI (not implied by upload).

## Release notes draft

Initial portable InstantStudy ChatGPT plugin package: connect an existing InstantStudy account securely; study from notes with active recall; save answers, track mastery and revisit due concepts. The plugin does not provide direct checkout, pricing experiments or shared Anki device access.

## Links

- https://developers.openai.com/plugins/deploy/submission
- https://developers.openai.com/plugins/deploy/submission-errors
- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/plugin-guidelines
