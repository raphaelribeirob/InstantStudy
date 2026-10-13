# InstantStudy™ — Unique Offer in the Actual App

**Date:** 2026-10-13
**Status:** implementation branch for Web + Flutter + landing, not deployed or merged.

## One promise across channels

**"Turn explanations into practice. Answer one question at a time, learn from feedback, then review what needs work."**

PT-BR: **"Transforme explicações em prática. Responda uma pergunta por vez, aprenda com o feedback e revise o que precisa melhorar."**

This promise is intentionally stricter than "AI flashcards in seconds." InstantStudy aims for an *active answer* as the moment of first value, not the upload, paid checkout or a polished generated summary.

## What is actually implemented in this PR

| Surface | User-facing change | Real behavior |
|---|---|---|
| Web landing | New source → practice promise, avoid claiming public AI account sync is live | Landing still routes to Web app; plugin entry marked in development |
| Web Home | Start from material, honest session identity/sync warning | Reuses existing `createMaterial` flow |
| Web Import | "Create and start practicing" | Import from owned material then `startMode('learn')` is actually called |
| Web Learn | First-answer confirmation, visible grounding note | `submitStudyAnswer` succeeds before the signal is shown; Test still suppresses early feedback |
| Web Completion | One-tap follow-up to practice the same source | Calls existing StudyEngine Learn flow, not a fake mastery update |
| Flutter Home | Bilingual "Understand. Practice." positioning and honest sync warning | Existing content-first native start preserved |
| Flutter Answers | Confirmation only after successful first non-Test answer | `_api.answer` remains source of truth; Test feedback suppression preserved |
| Flutter Completion | Real weak-concept labels from backend summary and Review-mode CTA | Starts existing Review flow using same material; does not claim a concept-specific re-test if not supported |
| CI | `npm run offer:check` | Structural regression guard; Flutter widget tests and TypeScript build run separately |

## Launch gates still open — DO NOT overclaim

- **Pedagogical quality:** deterministic flashcards/distractors and lexical overlap grading need a dedicated evaluation against real sources, contradiction/negation adversarial tests, qualified human raters and acceptance thresholds. UI changes do not solve educational correctness.
- **Identity across devices:** Flutter currently generates a new anonymous learner ID when the entry widget is mounted. Existing Web storage also is not equivalent to a verified cross-surface identity. The production plugin is not enabled. We only add honest warnings, not a fake shared-progress indicator.
- **Hard paywall:** this PR does not change checkout, entitlements or activate draft security PR #48. The current Free/Plus/Unlimited flow remains as-is until a consolidated policy change is tested.
- **Plugin:** OAuth functionality in draft PR #57 still requires Auth0 account mapping, paid entitlement sync and deployed E2E. Listing the plugin on the landing does not mean it can be used in production.
- **Instant Cloud:** the progress API in draft PR #58 is not integrated into any live Study app session; no new cross-device write is asserted.
- **Upload limits:** the current 2.5MB Web/Flutter BFF restriction remains, versus larger Quizlet upload experiences. Backend/BFF work is a separate task.
- **Metrics:** Web emits a non-PII client `instantstudy:product` event with `name='first_answer_submitted'` after a successful actual learner answer. This is a local browser event for future analytics wiring; **it is not proof that PostHog is receiving or recording the event.**
- **No live user-testing:** structural checks and CI do not establish that students learned or retained content.

## Release acceptance for this feature

1. User can paste source text, create a material and begin Learn in one operation on Web.
2. Question and submission are returned by the real StudyEngine, with test answers hidden until finish.
3. Web only confirms first-answer activation after submission succeeds; no source, answer or account identifiers in analytics.
4. Flutter intro, source input, first answer and completion display are fully localized in en + pt-BR.
5. Weak-concept labels appear only if present in server summary.
6. All interfaces avoid claiming production account sync before Auth0, identity mapping and the plugin are active.
7. TypeScript, Web build, Flutter analyze/test, security and `offer:check` gates pass for the exact PR commit.
8. Real staging E2E and external user-quality evaluation remain separately required before public release.

## Dependencies

- [Plugin OAuth PR #57](https://github.com/raphaelribeirob/InstantStudy/pull/57)
- [Instant Cloud PR #58](https://github.com/raphaelribeirob/InstantStudy/pull/58)
- [Fail-closed hard paywall PR #48](https://github.com/raphaelribeirob/InstantStudy/pull/48)
- [Neon owner-scoping PR #56](https://github.com/raphaelribeirob/InstantStudy/pull/56)

All work remains in a separate draft pull request to avoid automatically merging incompatible stacked branches or changing production billing behavior.
