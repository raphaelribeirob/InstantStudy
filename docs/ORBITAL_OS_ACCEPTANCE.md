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
| Spaced review | Review | `orbita` | Existing schedule, **not FSRS** |
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

1. `/app` opens Orbital OS with the central SmoothUI orb.
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

- Flutter's native homepage is **not yet orbital-first**. Web/PWA on mobile is responsive but is not native Flutter parity.
- The app still has browser speech recognition/TTS where supported, not OpenAI Realtime duplex audio.
- The scheduler remains InstantStudy's existing heuristic, not migrated to FSRS.
- Study-guide and flashcard quality, podcast generation, retention validity and game richness require separate pedagogical/product validation and upgrades.
- ChatGPT plugin display is still controlled by the host environment; this Web design does not imply identical widgets inside ChatGPT.
- Deployment, user-facing smoke testing and accessibility audits must be performed before replacing production.
