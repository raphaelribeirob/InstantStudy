# InstantStudy — Quizlet 100% Functional Offer Parity Matrix

**Baseline:** 2026-10-12 | **State:** NOT CERTIFIED | **Commercial decision:** HARD PAYWALL ONLY | **Primary database:** NEON PostgreSQL

> This is a release contract, not a statement that these features work in production. The machine-readable source of truth is [quizlet-parity.manifest.json](./quizlet-parity.manifest.json). Run `npm run audit:parity`. The CI audit validates coverage and evidence honesty, but DOES NOT prove an end-to-end product journey.

## What "100%" means

- Full functional coverage of Quizlet's publicly announced student, teacher, learning-game, content and mobile offer **as of the baseline date**. Do not copy Quizlet brand, proprietary code, licensed sets or textbook answers.
- A feature is **verified** only when Web/iOS/Android (where applicable), backend persistence, security, pedagogical tests and owner-approved production evidence are attached.
- `partial` means some production-oriented code exists, but the acceptance test is incomplete. `implemented_unverified` means implementation exists without end-to-end certification. `blocked` means credentials, licenses or another dependency remain. `missing` means not adequately implemented.
- A missing proprietary-content catalog cannot be marked equivalent just because AI can generate responses. Release claims must disclose catalog gaps until licensing/coverage is real.

## Current inventory (NOT implementation completion)

| Requirement count | Partial | Implemented, unverified | Blocked | Missing | Verified |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 48 | 18 | 6 | 8 | 16 | 0 |

## Complete acceptance register

| ID | Outcome to deliver | Priority | Code audit status | Starting point (not proof) |
| --- | --- | --- | --- | --- |
| BILL-01 | Hard paywall on all learning surfaces | P0 | partial | `apps/web/api/_hardPaywall.js` |
| BILL-02 | Payment ownership, lifecycle and revocation | P0 | partial | `docs/HARDWALL_E2E_ACCEPTANCE.md` |
| BILL-03 | MCP and direct API per-user paid authorization | P0 | blocked | `apps/mcp-server/src/hardPaywallSignature.ts` |
| BILL-04 | Teacher/institution sponsored paid seats | P1 | missing | `apps/pay/api/entitlements.js` |
| ING-01 | Text, TXT, Markdown, CSV | P0 | implemented_unverified | `apps/mcp-server/src/ingest.ts` |
| ING-02 | PDF, DOCX, PPTX import | P0 | implemented_unverified | `apps/mcp-server/src/ingest.ts` |
| ING-03 | Photo, handwritten notes and diagrams OCR | P0 | blocked | `apps/mcp-server/src/ingest.ts` |
| ING-04 | Lecture recording, upload and transcription | P0 | blocked | `apps/mcp-server/src/ingest.ts` |
| ING-05 | Private Google Drive and native file selection | P0 | blocked | `apps/web/src/googleDrivePicker.ts` |
| ING-06 | Large files with durable object storage | P1 | partial | `apps/mcp-server/src/largeAudioUpload.ts` |
| SETS-01 | Source-grounded guides, summaries and outlines | P0 | partial | `apps/mcp-server/src/studyAssetIntelligence.ts` |
| SETS-02 | Generated and manually created study sets | P0 | partial | `apps/web/src/MaterialEditor.tsx` |
| SETS-03 | Edit, duplicate, import/export and reorder flashcards | P0 | partial | `apps/web/src/MaterialEditor.tsx` |
| SETS-04 | Images, audio, equations and diagrams on cards | P1 | missing | `apps/web/src/SoftwareApp.tsx` |
| SETS-05 | Folders, favorites, labels, browse and permissions | P1 | partial | `apps/mcp-server/src/materialStore.ts` |
| SETS-06 | Know vs Still learning, shuffle and flip | P0 | partial | `apps/web/src/SoftwareApp.tsx` |
| LEARN-01 | Adaptive Learn multiple choice and written | P0 | implemented_unverified | `apps/mcp-server/src/studyEngine.ts` |
| LEARN-02 | Spell and Write modes with audio | P0 | missing | `apps/mcp-server/src/studyEngine.ts` |
| LEARN-03 | Repair weak concepts and mastery | P0 | implemented_unverified | `apps/mcp-server/src/studyEngine.ts` |
| LEARN-04 | Practice Test configurable types, timer, grading | P0 | partial | `apps/mcp-server/src/studyEngine.ts` |
| LEARN-05 | Answer-quality calibration and sources | P0 | partial | `apps/mcp-server/src/questionGenerator.ts` |
| ASK-01 | Multi-turn contextual tutoring and step-by-step help | P0 | partial | `apps/mcp-server/src/learningIntelligence.ts` |
| ASK-02 | Convert Ask threads to saved sets and next practice | P0 | missing | `apps/mcp-server/src/materialStore.ts` |
| REVIEW-01 | FSRS due scheduling, offline-safe state and review | P0 | partial | `apps/mcp-server/src/studyPersistence.ts` |
| REVIEW-02 | Insights, weak concepts, streak, charms | P0 | implemented_unverified | `apps/mcp-server/src/offerLayer.ts` |
| AUDIO-01 | Guided audio and podcast from source | P1 | partial | `apps/mcp-server/src/offerLayer.ts` |
| AUDIO-02 | Locale-valid TTS, playback speed and background | P1 | missing | `apps/flutter_app/lib/main.dart` |
| GAME-01 | Match with accuracy, timed scores | P1 | partial | `apps/mcp-server/src/offerLayer.ts` |
| GAME-02 | Blast equivalent asteroid gameplay | P1 | missing | `apps/web/src/SoftwareApp.tsx` |
| GAME-03 | Blocks equivalent puzzling gameplay | P1 | missing | `apps/web/src/SoftwareApp.tsx` |
| GAME-04 | Quizlet Live equivalent team classroom mode | P1 | missing | `apps/mcp-server/src/studyRoomStore.ts` |
| SOCIAL-01 | Study groups, shared sets and progress | P1 | partial | `apps/mcp-server/src/studyRoomStore.ts` |
| SOCIAL-02 | Family independent accounts and seats | P1 | partial | `apps/pay/api/family.js` |
| TEACH-01 | Teacher classes and assignments | P1 | missing | `apps/mcp-server/src/studyRoomStore.ts` |
| TEACH-02 | Class progress and exportable reports | P1 | missing | `apps/mcp-server/src/studyEngine.ts` |
| TEACH-03 | Google Classroom connection | P2 | missing | `apps/web/src/googleDrivePicker.ts` |
| CATALOG-01 | Discover/search shared public sets | P2 | missing | `apps/mcp-server/src/materialStore.ts` |
| CATALOG-02 | Expert-verified step-by-step textbook solutions | P2 | blocked | `docs/OFFER.md` |
| CATALOG-03 | Community contributions and abuse moderation | P2 | missing | `docs/OFFER.md` |
| OFFLINE-01 | Encrypted offline mobile study | P1 | missing | `apps/flutter_app/lib/main.dart` |
| OFFLINE-02 | Offline edits and conflict reconciliation | P1 | missing | `apps/flutter_app/lib/main.dart` |
| GLOBAL-01 | All offer languages translated | P0 | partial | `apps/web/src/i18n.ts` |
| GLOBAL-02 | Per-locale teaching, grading, voice and OCR | P0 | blocked | `apps/mcp-server/src/studyAssetIntelligence.ts` |
| GLOBAL-03 | Native purchase/local money/data formatting | P0 | missing | `apps/web/src/App.tsx` |
| OPS-01 | Neon exclusively as primary database | P0 | implemented_unverified | `apps/mcp-server/src/databasePolicy.ts` |
| OPS-02 | Production Web/API same release and healthy | P0 | blocked | `docs/HARDWALL_E2E_ACCEPTANCE.md` |
| OPS-03 | Security OWASP, privacy, A11y, load and recovery | P0 | partial | `docs/HARDWALL_E2E_ACCEPTANCE.md` |
| OPS-04 | Plugin OAuth per learner and correct paid access | P1 | blocked | `docs/AGENT_CONNECTIONS.md` |

The exact Given/When/Then requirements, test applicability, source URLs, regional languages and evidence fields live in the JSON manifest. **No row may be marked verified without reviewable evidence.** Every official new/removed feature triggers a matrix update.

## Global First — 17 offer languages / 19 regional locales

| Offer language | Locales | Current UI | Pedagogy | Voice/recognition |
| --- | --- | --- | --- | --- |
| English | en-US, en-001 | partial | unverified | unverified |
| Dutch | nl | missing | unverified | unverified |
| French | fr-FR, fr-CA | missing | unverified | unverified |
| German | de | missing | unverified | unverified |
| Indonesian | id | missing | unverified | unverified |
| Italian | it | missing | unverified | unverified |
| Japanese | ja | missing | unverified | unverified |
| Korean | ko | missing | unverified | unverified |
| Polish | pl | missing | unverified | unverified |
| Portuguese | pt-BR | partial | unverified | unverified |
| Russian | ru | missing | unverified | unverified |
| Simplified Chinese | zh-Hans | missing | unverified | unverified |
| Spanish | es | missing | unverified | unverified |
| Traditional Chinese | zh-Hant | missing | unverified | unverified |
| Turkish | tr | missing | unverified | unverified |
| Ukrainian | uk | missing | unverified | unverified |
| Vietnamese | vi | missing | unverified | unverified |

The current code contains English and pt-BR translation catalogs only; neither is certified for all surfaces. Source-material language, question language and app UI language must be independently selectable. Do not fake translation by exposing an English fallback as a fully supported locale.

Global acceptance per locale requires: translation completeness (Web + Flutter + paywall + error states + notifications); right-to-left safety where relevant; culturally accurate dates/currency; source-grounded study generation and grading; human sample audit; screen-width and accessibility; real voice/OCR benchmark or a truthful per-feature availability matrix.

## Immutable product principles

1. **Only Hard Paywall:** user may access legal, authentication, billing, subscription restoration and pre-payment onboarding surfaces without purchase; never actual learning capabilities. Native purchases need StoreKit/Google Play support; all paid permissions resolve at a trusted server boundary. Institution-sponsored paid seats are allowed, not a public freemium tier.
2. **Neon exclusive database:** user/material/session/entitlements and learning state live in Neon. Encrypted object storage for file bytes and temporary offline cache are permitted, but not Firebase or another competing system of record.
3. **Do not merge staged PRs prematurely:** keep existing feature chain (#33 → #35 → #36 → #37 → #38) until account, payment, mobile purchases, 17 languages and live QA are complete.
4. **Open-source discovery before custom builds:** compare up to three licenses/security/maintenance-compatible candidates; record accepted version, smoke results and fallback in [OPEN_SOURCE_GAP_REGISTER.md](./OPEN_SOURCE_GAP_REGISTER.md).
5. **Universal authorization:** no user ID spoofing, browser-provided entitlement, shared MCP token bypass, or direct trusted-API bypass.
6. **No false CI green:** green typecheck/tests/build is **not** a 100% offer certificate. Only explicit `INSTANTSTUDY_CERTIFY_100=1 npm run audit:parity` can request a certificate; it must fail while any gate is open.

## Mandatory launch evidence

- Real user registration, checkout (Paddle sandbox and native store), entitlement, renewal, refund, cancellation and restore are observed in controlled test accounts.
- Import a representative set of real files, create/edit/reopen/review/test/Ask and verify persistent source-grounded outcomes in Neon.
- Two-device and offline sync tested; room/class members cannot access other learners' data.
- All 17 language groups reviewed by competent speakers on a defined reference corpus and all 19 regional locales verified.
- Production Web, backend and payment have a linked SHA, health/readiness response, post-deploy smoke, crash/error monitoring.
- OWASP dependency scan, live ZAP, authorization/IDOR penetration checks, load, accessibility and rollback runbooks approved.

## Official baseline sources

- appstore: https://apps.apple.com/us/app/quizlet-more-than-flashcards/id546473125
- study: https://quizlet.com/features/study-modes
- ask: https://quizlet.com/features/ask-quizlet
- games: https://quizlet.com/features/learning-games
- group: https://quizlet.com/features/study-groups
- teachers: https://quizlet.com/br/features/teachers
- intro: https://quizlet.com/content/quizlet101
- guides: https://quizlet.com/features/study-guides/
- ai: https://quizlet.com/features/ai-study-tools

## Acceptance workflow

`RESEARCH → OSS AUDIT → PROTOTYPE → IMPLEMENT → UNIT/CONTRACT → E2E → SECURITY → PEDAGOGICAL QA → LOCALE QA → PRODUCTION SMOKE → VERIFIED`.

Each status change requires a linked test report/PR and owner signoff. No code or deployment in this PR is an automatic product-release approval.
