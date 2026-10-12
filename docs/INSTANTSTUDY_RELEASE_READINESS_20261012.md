# InstantStudy: verified release checklist (2026-10-12)

This branch does **not** claim 100% Quizlet parity or live payment acceptance.

## Completed on preview
- Reviewed owner-bound study APIs and added regression tests for cross-learner access.
- Neon preview `br-winter-cell-b5bgafip` / database `instantstudy`: created additive material and session tables and their indexes; confirmed schema presence.
- The hosted Web and Study API hard paywalls fail closed even with unset or false feature flags (inherited from `fix/instantstudy-hardwall-failclosed-20261012`).

## Verification commands
- `npm install && npm run typecheck && npm test && npm run build && npm run security:audit`
- `npm run audit:database && npm run audit:parity` checks static assumptions only.
- `DATABASE_URL=<from a secured CI secret> npm run audit:neon-live` verifies the schema on a named Neon branch.
- `npm run audit:release` deliberately **fails** until all manifest acceptance and language evidence is attached.

## Release blockers
1. Real Paddle subscription creation, signed webhooks, cancel/refund/restore and login ownership; do not use mock provider results as production evidence.
2. Web + API + Pay deployed from one tested commit with synced HMAC signing and Neon branch URLs.
3. Install paid OAuth for MCP; shared bearer tool access remains disabled on hosted.
4. Reproduce all 48 feature acceptance tests and the 17-language (19 regional locale) scope on actual devices and browsers.
5. Native StoreKit and Google Play verification; placeholder buttons do not count.
6. OWASP/ZAP/Playwright/load testing and database backup/restore drill.
7. Release approval only after `npm run audit:release` succeeds and independent production smoke tests are recorded.

**Do not merge/deploy as a 100% release while any gate is red.**
