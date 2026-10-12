# InstantStudy — Orbital-First OS acceptance

## Scope

The **Órbita** is the primary Web/PWA interaction surface at `/app`. It reuses the existing study, library, room, billing and MCP backends. The original `SiriOrb` from SmoothUI, adapted under MIT, is the persistent identity on the product's shell; the central full-size orb and eight focus nodes are navigational, not independent learning engines.

This release is a **UI and interaction transformation**. It is not a claim that the existing capabilities reached Quizlet quality parity, nor that a new speech or spaced-repetition backend was installed.

## Supported orbital offers (real workspaces)

| Offer capability | Orbital action | Existing production-facing workspace | Notes |
|---|---|---|---|
| Import PDF / DOCX / slides / notes / audio | Import | `create` | Existing web import paths & configured extractors |
| Library / search | Library | `library` | Learner-scoped list from study API |
| Study guide | Guide | `guide` | Existing grounded/extractive assets |
| Flashcards | Flashcards | `flashcards` | Existing generated front/back cards |
| Adaptive Learn | Learn | `learn` + `prepareStudy("learn")` | Existing Study Engine |
| Quiz | Quiz | `learn` + `prepareStudy("quiz")` | Existing Study Engine, quick grading |
| Practice tests | Test | `test` | Keeps existing test builder and delayed grading |
| Ask | Ask | `ask` | Existing grounded Q&A |
| Spaced review | Review | `orbita` | **ts-fsrs** for new graded attempts; stored legacy due dates preserved until next review |
| Retention insights | Insights | `insights` | Mastery proxy, due count, streaks |
| Podcast | Podcast | `audio` | Existing 2-speaker script and browser TTS |
| Charms/game | Game | `game` | Existing card matching, not Quizlet Charms parity |
| Study with friends | Friends | `friends` | Existing room, progress and invitations by code |
| Family plan | Family | `family` | Existing billing/entitlement flows |
| Agent connection | Connect AI | `plugin` | Existing MCP endpoint and presets |

## Interaction contract

- First visit to `/app` opens **Órbita**, not the former dashboard.
- The central orb is the **actual MIT-licensed SmoothUI Siri Orb**, not a hand-painted lookalike.
- Eight primary tools orbit the core on large screens; **on mobile**, an accessible tools grid replaces small circular touch targets.
- The right console shows **real** due reviews, library size and estimated mastery; no fabricated examples or fake progress.
- "Recommended next" uses: due reviews -> review; otherwise material present -> learn; otherwise -> import.
- All fifteen offer tools remain reachable as explicit buttons in the lower grid.
- Switching a workspace retains a compact orbital navigation and a return-to-center control.
- The classic sidebar is preserved behind an opt-in "Tools" control to reduce migration risk.
- Returning home re-queries due reviews and insights; library is the existing learner-scoped store.
- Input-by-voice supports **navigation commands only**. It must never be represented as general Realtime conversational tutoring. Commands are parsed through a deterministic, allowlisted resolver.
- The microphone starts only when the user presses the mic button; typing and touch remain fully functional without browser speech support.
- Audio transcription by a browser speech provider may leave the device. Explain it in the interface.
- Narration/dictation inside the Review workspace are controlled separately by the learner.
- Do not expose auth secrets or source credentials to the browser.

## Acceptance tests

1. `/app` opens Orbital OS with the central SmoothUI orb, and keeps a compact live Siri Orb plus optional voice control beside **every active workspace** on larger screens (stacked on phones).
2. Empty learner: no invented due items, recommended action -> Import.
3. Existing learner: nonempty library shows material links and can open Learn.
4. Learner with due reviews: count matches `getDueReviews` and recommended action -> Review.
5. Orbit node **Quiz** starts the real quiz mode; **Test** preserves the question/time builder.
6. All fifteen cards open the existing corresponding workspaces; material-dependent actions without a material route to Import.
7. Dictation request only works after a user gesture; unsupported browser shows typed command alternative.
8. Reopen the orbit and recover navigation without losing saved material.
9. At 360px: no tiny orbital click targets; buttons in the tools grid are operable; content does not overflow horizontally.
10. Reduced motion: animation relies on SmoothUI's reduced-motion policy; UI is functional without decorative animation.
11. Baseline `npm run typecheck`, `npm test`, `npm run build`, `npm run security:audit`, Flutter analyze/test and OWASP workflow must pass.

## What remains outside this PR

- Flutter native now has an **Orbital-First home and contextual learning scenes** connected to the existing BFF. Its animated sphere is a Flutter-native gradient interpretation, **not** the vendored React SmoothUI component. Native OpenAI Realtime duplex voice, live microphone recording, full podcast parity, native billing/ChatGPT plugin configuration and visual device QA are still pending.
- Web/PWA offers **OpenAI Realtime WebRTC voice tutoring** with a paid account and backend flag, separately from browser navigation dictation; normal Browser Speech APIs remain fallbacks for existing study and navigation. A live voice response **does not** update Study Engine mastery or replace signed answer submission.
- The Study Engine now uses **ts-fsrs** for newly submitted graded answers. Prior review dates are not overwritten until the learner performs a new recall; historic data is not fabricated.
- Study guides and flashcards now **optionally** use OpenAI Structured Outputs, with source-evidence checks and a deterministic fallback. Quality, podcast generation, retention validity and game richness still require real learner testing and separate product improvements.
- ChatGPT plugin display is still controlled by the host environment; this Web design does not imply identical widgets inside ChatGPT.
- Deployment, user-facing smoke testing and accessibility audits must be performed before replacing production.

## OpenAI Realtime voice — integration acceptance

- `apps/web/src/useRealtimeTutor.ts` creates WebRTC media tracks only after clicking the dedicated **Speak with OpenAI** button in the main Orbital OS or the Review workspace.
- User's study material is capped to 6,000 reference characters (voice quality and cost constraint); untrusted source data cannot override tutor policy.
- Browser sends its SDP through `/api/study` with `action: "realtime_offer"`. The BFF requires a **verified, non-anonymous Instant Account** and active **Plus/Unlimited** entitlement; the browser never receives a provider API key.
- `apps/mcp-server/src/server.ts` enforces bearer API authorization, `INSTANTSTUDY_REALTIME_ENABLED=true`, `OPENAI_API_KEY`, request validation, and 3 starts/day by default through **atomic Neon quota** before forwarding the SDP to `https://api.openai.com/v1/realtime/calls`.
- Server uses `gpt-realtime-mini` by default (overridable by backend `INSTANTSTUDY_REALTIME_MODEL`), voice `marin`, server VAD, max 360 output tokens per response, and no AI tools.
- Audio flows directly on negotiated WebRTC tracks. The vendor Siri Orb reacts to **real** microphone/audio amplitude; microphone and peer connection are released when the learner ends the call, navigates away, encounters failure or reaches the **3-minute client timer**.
- The separate deterministic Learn/Review/Test flows remain the sole source of truth for grading, mastery and next-review timing. Live conversation does not write grades or schedule reviews.
- The prior `microphone=()` Permissions Policy has been corrected to `microphone=(self)` so first-party opted-in recording is possible.
- On missing Account login, insufficient paid entitlement, disabled feature flag, missing OpenAI key, unavailable Neon, declined microphone or provider outage, the UI **must show a real error**; it must never simulate a connected voice session.
- **Operating caveat:** the 3-minute timer is enforced by the cooperative browser, not a server-side spend meter. Configure an OpenAI project budget, monitor OpenAI usage and consider server-side active-session enforcement before a broad paid release.

### Deployment switches

| Setting | Owner | Where |
| --- | --- | --- |
| `OPENAI_API_KEY` | Secret | **InstantStudy API server** only |
| `DATABASE_URL` | Secret | **InstantStudy API server** (Neon) |
| `INSTANTSTUDY_REALTIME_ENABLED` | Boolean | API server; enable explicitly in preview and later in approved production |
| `INSTANTSTUDY_REALTIME_MODEL` | Optional | API server; default `gpt-realtime-mini` |
| `INSTANTSTUDY_REALTIME_SESSIONS_PER_DAY` | Optional | API server; default `3` |

The Web app needs no OpenAI key. It uses the existing `INSTANTSTUDY_API_URL` and `INSTANTSTUDY_API_KEY` private BFF settings.

### Additional validation

1. No account → session creation returns 401; no microphone session is started with paid features.
2. Signed-in Free → 403; authenticated paid plan → allowed if quota and flag permit.
3. Missing OpenAI key/feature flag/Neon → 503, without emitting an SDP response.
4. Quota exhausted → 429, no request to OpenAI.
5. WebRTC SDP answer is accepted and audio/assistant conversation works on supported browsers.
6. Switch pages or terminate → microphone indicator disappears, audio stops and state resets.
7. Transcript and voice feedback do not increase mastery without an explicit StudyEngine answer.
8. Mobile Web/PWA 360px and keyboard controls remain usable with the new voice tutor.
9. Usage/spend report is inspected before considering release; CI and OWASP dependency checks are **not** live call or cost validation.

## Orbital app unification (October 2026)

**Web/PWA:** `SoftwareApp.tsx` now **always mounts one `OrbitaSystem`**. Selecting an offer module changes a contextual workspace on the right (desktop) or below the compact orb (mobile), rather than replacing the entire orbital experience. The same materials, feedback, persistence, scheduler and billing backends continue to serve every workspace. The compact study sidecar is `orbital-focus.css`. All fifteen existing offer surfaces remain linked.

**Web voice:** OpenAI Realtime can call two **explicit, non-destructive functions**: `open_study_mode` (allowlisted 15 routes, UI navigation only) and `get_study_context` (read-only selected material name, due queue size and *estimated* mastery). The client validates the mode before executing. Voice tools **cannot** evaluate or store answers, purchase plans, join rooms or start uploads. Explicit learner submissions in the Study Engine continue to be authoritative. On user-clicked navigation, the tutor closes; voice-initiated tool navigation preserves the call, within its 3-minute client budget.

**Flutter native:** `orbital_home.dart` provides the default Refero-like Orbital OS entrypoint with an animated gradient sphere and a full-size 12-mode action grid. Actions reuse existing API flows via `main.dart` and `instantstudy_api.dart`. Native contexts include:
- Import material (paste, files and selected audio), library load/select, generated extractive guide, flashcard reveal, Ask sourced questions
- Adaptive Learn, Quiz, Practice Test, and due-concept Review with persisted StudyEngine grading
- Podcast via existing native TTS, insights, study matching game, and Create/Join Study Room
- Learner ID stored in SharedPreferences for continuity between app launches

**Not yet equivalent:** Flutter sphere does not reproduce exact SmoothUI/ElevenLabs animation; native OpenAI Realtime voice is not installed. Flutter does not provide every Web offer management surface (family billing, MCP configuration, native live recording) yet. Web voice does not write graded answers, and generated content remains deterministic/extractive in parts. A responsive codebase and passing CI are not proof of real-device readiness or Quizlet pedagogical parity.

### Acceptance checklist

1. Web remains visually orbital on Home, Test, Flashcards, Ask, Library, Review, Insights and Friends, including 360px phone widths.
2. Opening a new contextual scene never discards the current material or restarts an active live voice call unless the user clicked manual navigation.
3. An explicitly spoken 'open quiz' executes only the allowlisted local navigation function and returns a tool result; no durable grade is written.
4. Speech requests for payments, saving fake scores or deleting records do **not** have an executable model tool.
5. Native Flutter cold start displays the native OrbitalHome, not the legacy import form; Import is one of the offered actions.
6. Native learner identity persists and due reviews are read from the authenticated study BFF.
7. Native Question/Answer session writes grade through existing StudyEngine, while flashcard flip does **not** falsely claim graded retention.
8. Native Talk-to-OpenAI action is **not** represented as active until native WebRTC client and paid authentication are completed.
9. Flutter analyze/test, TypeScript checks, JS tests, Web build and security workflow pass before merge.
10. Live WebRTC, file imports, app store purchase flows, keyboard and screen-reader behavior must be manually validated on representative real devices.

## Sensor Tower / Quizlet offer gap closure — October 2026

This branch adds specific engineering improvements over the prior UI-only parity:

| Product promise | New implementation | Qualification |
|---|---|---|
| Personalised flashcards and guides | `studyAssetIntelligence.ts` uses OpenAI Responses Structured Outputs with source-evidence strings checked against original text, 10 requested cards, short guide and keywords | **Preview opt-in only**, requires API key, Neon and per-user 3/day atomic quota; deterministic fallback on unavailable provider, short documents and insufficient grounding; quality not yet human-evaluated |
| Study questions based on those flashcards | Web/Flutter pass generated questions and source excerpts into `StudyEngine` `concepts[]` for Quiz, Learn and Test, replacing generic prompts for recall/short-answer where available | Existing multiple-choice distractors and assessment calibration remain areas for improvement |
| Longer lecture recordings | Signed-in Plus/Unlimited accounts send audio files up to **25 MB** in **1.75 MB** chunks to Neon staging, then finalise transcription and create a regular study material | **Web/PWA only**; 24-hour expiry, 2 new uploads/day, 2 pending; cannot claim hours of recording or guaranteed Vercel response time before live testing; upload stored temporarily in Neon; no native Flutter chunk upload |
| Objective question grading | Choose-from-options checks the currently presented source-backed correct answer rather than lexical keyword similarity | Open response/essay grading still uses semantic model with deterministic fallback and requires human QA |
| Spaced repetition | `ts-fsrs` per-concept persisted state and real-answer updates | Legacy due dates are retained until the next real answer; does not infer historical reviews or imply measured retention |
| Single orbital learning experience | Review screen suppresses its duplicate Siri Orb and duplicate OpenAI live tutor when embedded in the persistent Web orb | Separate mobile Flutter gradient remains independent from React visual implementation |

**Preview configuration:** `INSTANTSTUDY_AI_ASSETS_ENABLED=true` is configured only on the `feat/orbita-voice-review` Vercel API preview branch. `INSTANTSTUDY_AI_ASSETS_PER_DAY` default is 3. Do not activate on production without cost monitoring and end-to-end acceptance.

**Not solved by this increment:** offline downloadable narrated podcasts, richer Charms gameplay, collaborative live editing, 16-language localisation, native Flutter WebRTC, mobile store subscription parity, human-validated grading quality, large audio >25 MB, provable long-term memory outcomes, and a confirmed production deployment.

### New verification gates

- Upload a 4 MB real audio file from a paid test account, ensure chunk staging, transcription and material creation work; refuse Free/anonymous on larger files.
- Demonstrate quota exhaustion, file type/size rejection and old pending chunk expiry without leaking source text or keys.
- Generate cards in Portuguese and English, verify exact evidence exists in the source, and test AI quota fallback without network.
- Complete consecutive graded attempts, verify real FSRS card state is persisted and inherited across sessions.
- Perform a quiz with actual source-based authored prompt and verify the answer plus persisted grade.
- Verify one and only one active main Siri Orb is visible during Review.
- Run TypeScript, tests, Flutter analyze/test and OWASP; human QA and live API tests remain mandatory before production.

