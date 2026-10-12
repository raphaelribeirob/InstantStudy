# InstantStudy — Negative Review Acceptance Register
Baseline: 2026-10-12. Assessment of public Quizlet complaint themes against InstantStudy. **NOT CERTIFIED** and not a claim of 100% user satisfaction.

## Rules
- GitHub CI passing is not evidence of real billing, device, or production behavior.
- Keep the explicitly selected **hard paywall** and Neon-only primary database.
- Do not mark features verified without independently reviewable test evidence.
- Complaint about mandatory payment is a known product-strategy tradeoff, not a technical bug.

| ID | Negative review theme | GitHub changes | Current status | To certify |
| --- | --- | --- | --- | --- |
| NEG-01 | Mandatory fees, ad interference | No in-study ads detected; hard paywall retained | Unresolved strategic tradeoff | User research and clear prepayment disclosures |
| NEG-02 | Misleading prices, surprise limits | Removed static, unverified plan quotes; labels clarify checkout total, currency, renewal, limits | Partial | Actual localized checkout and subscription terms E2E |
| NEG-03 | Cancellation/refund/restore | Account ownership and entitlement revocation guards | Blocked | Real merchant and native store lifecycle tests |
| NEG-04 | Contradictory answers marked correct | High-overlap negation/number conflict checks and conservative scoring fallback | Implemented, unverified | Multilingual human-labeled adversarial grading corpus |
| NEG-05 | Repeated Practice Test concepts | Least-attempted-per-session concept ordering | Implemented, unverified | Realistic 10–50 question corpus and client E2E |
| NEG-06 | Implausible answer alternatives | Topic-adjacent source choice ranking, duplicate-concept exclusion and text fallback | Partial | Human-judged distractor quality and source perturbations |
| NEG-07 | Cannot edit/duplicate/import/export flashcards | Persistent editor, duplicate, CSV import/export, known/learning progress | Partial | Native and browser material round trips |
| NEG-08 | Slow or unstable sessions | Existing GitHub CI | Unverified | Load testing, crash monitoring, P50/P95 benchmarks |
| NEG-09 | Audio control / language / autoplay | Sequential spoken segments, voice locale and playback-speed selector; cancels stale audio on material change | Partial | Real browsers, native devices, background playback |
| NEG-10 | Offline mobile frustrations | Flutter app and PWA partial | Blocked | Encrypted offline, sync-conflict, store receipts |

## Regression locations
- `apps/mcp-server/src/learningIntelligence.test.ts` — negation, opposing dates, valid negative source, paraphrase.
- `apps/mcp-server/src/studyEngine.test.ts` — no exam concept repeated until others tested.
- `apps/mcp-server/src/questionGenerator.test.ts` — relevance and duplicate-concept regression.
- `apps/mcp-server/src/paidAccessGuard.test.ts`, `apps/web/api/hardwallJourney.test.js` — paid-user isolation.

## Exit gate
Keep this complaint register separate from the 48-item Quizlet offer-parity manifest. **Release remains NOT CERTIFIED** until service, mobile, checkout and pedagogical QA are independently evidenced, with signed off production deployment health and no outstanding P0 defects. Do not fake acceptance using mocked provider responses.
