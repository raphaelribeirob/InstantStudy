# InstantStudy — Quizlet core offer parity audit and acceptance (2026-10-12)

Reference: Quizlet's own public feature pages for AI tools, study guides, flashcards, practice tests and Ask:
- https://quizlet.com/features/ai-study-tools
- https://quizlet.com/features/study-guides/
- https://quizlet.com/features/ai-flashcard-generator/
- https://help.quizlet.com/hc/en-us/articles/25946589648013-Studying-with-Practice-Tests
- https://help.quizlet.com/hc/en-us/articles/42790350723725-Studying-with-Ask-Quizlet

The goal is **functional equivalence for the core owned-material → study loop**, not cloning Quizlet's design, copyrighted content, classroom enterprise products, public marketplace, or proprietary recommendation algorithms.

## Acceptance matrix

| Criterion | Status in this branch | Evidence and remaining verification |
| --- | --- | --- |
| Paste, TXT, PDF, DOCX, PPTX | Implemented in prior branches | Manual sample-file E2E on Web & Flutter |
| Audio recording/upload | Conditional | Groq/OpenAI transcriber keys, quotas, accurate transcripts and mobile QA |
| Camera/handwritten notes | Conditional | Gemini/OpenAI vision configured + sample image QA |
| Private Google Drive | Conditional Web | Google Picker OAuth/app ID, test real private document; Flutter OAuth outstanding |
| Source-grounded guide + flashcards | Implemented with fallback | Real LLM output quality and groundedness benchmark; deterministic fallback must be labeled |
| **Edit title, summary, outline, cards** | **Implemented in this PR (Web)** | Owner-scoped Neon update API; verify persistence after reload |
| **Add/delete/reorder cards** | **Implemented in this PR (Web)** | Test adding, editing and Study Engine using edited source; Flutter editor pending |
| **Practice Test difficulty selection** | **Implemented in this PR (Web)** | Foundation/standard/advanced passed to engine, influences question type weighting / phrasing; pedagogical calibration outstanding |
| No fabricated MC distractors | **Improved in this PR** | Fallback to written recall where three source-backed alternatives unavailable |
| Learn adaptive / FSRS reviews | Prior implementation | Timed sessions, due-state and long-term retention validation |
| Source-grounded Ask + next-step action | Partial | Extractive-first, optional LLM; no conversation history + editable set creation from Ask yet |
| Study games, podcast, friends, insights | Prior implementation | Matching/TTS foundation; device, voice and learning evaluation |
| Payment conversion/trial | NOT production-ready | Paddle product/price keys, webhooks, verified identity; native StoreKit/Google Billing |
| Native Flutter editing/advanced test controls | Partial | Native controls and parity still required |
| Latest code in production | No | Vercel deploy quota, branch PR chain and protected release |

## Security gates

- Do not allow browser to choose arbitrary owner or generated-by provider for edits.
- Server verifies owner via `materialStore.get(learnerId,id)`; updated row always filtered by `learner_id`.
- New editable content must be bounded and sanitized, with at least one card.
- Web BFF uses existing verified-identity logic and HMAC to API when required.
- Do not merge user-authored content into model policy prompts.
- Do not enable Hard Paywall, MCP premium gate or native store purchases without E2E billing validation.
- The owner may edit content; that content is **user-authored**, not automatically sourced to the original uploaded document after modification.

## Quality tests before 100% claim

1. Assemble ≥30 sample sources in English and Portuguese: notes, slide, PDF, lecture, handwritten photo, drive doc.
2. Human-score source faithfulness, hallucination rate, flashcard specificity, exam distractor plausibility, topic coverage and clarity.
3. Verify all 3 difficulty levels produce demonstrably different assessments without leaking solutions.
4. Run Web & iOS/Android interaction journeys, save/reload/edit and verify typed answers update mastery correctly.
5. Complete credentials and payment/restore tests in sandbox then production smoke tests.
6. Install CI acceptance gates and capture live metrics: upload success, first answer, test completion, retention, trial/paid conversion and error rates.
7. Explicit operator signoff only if no P0/P1 defects and required sample journeys pass.

**Scope note:** Existing requested Hard Paywall is kept feature-flagged and disabled in production; Quizlet's value-first/free limits remain a separate experiment. Do not silently override the owner's commercial decision.

**Release state:** staged feature branch, not a claim of operational or revenue parity.
