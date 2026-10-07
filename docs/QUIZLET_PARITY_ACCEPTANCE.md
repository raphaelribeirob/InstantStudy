# Quizlet Offer Parity — Acceptance Criteria

This release closes the product gaps identified against the validated Quizlet-style offer while preserving InstantStudy's differentiator: deterministic-first adaptive learning across AI agents.

## Definition of Done

A criterion is accepted only when:
1. the user-facing path is functional, not a visual placeholder;
2. backend state is the source of truth where persistence/adaptation matters;
3. no privileged API credential is exposed to a browser or Flutter client;
4. automated tests/typecheck/build pass in CI.

## AC-01 — Bring your own material

**Given** a learner has study material,
**when** they create a material in InstantStudy,
**then** the product accepts:
- pasted text;
- PDF;
- DOCX;
- PPTX;
- TXT/Markdown/CSV;
- audio upload;
- browser microphone recording;
- public/shared Google Drive file link.

Web/Flutter inline uploads are capped at 2.5 MB per file so the secret-holding BFF stays below serverless request limits. MCP/remote-file ingestion retains the larger backend limit.

**Pass:** extracted text is returned by the backend and becomes the saved source material.
**Fail:** the UI only changes tabs or shows a fake upload state.

## AC-02 — One source creates real study assets

**Given** an imported material with extractable text,
**when** import completes,
**then** the backend persists:
- summary;
- outline/key ideas;
- key concepts;
- question/answer flashcards.

Flashcard fronts must be meaningful learner-facing prompts and must not be generic labels such as `Concept 1`.

**Automated gate:** `studyAssets.test.ts`.

## AC-03 — Flashcards are active-recall cards

**Given** generated flashcards,
**when** a learner opens Flashcards,
**then** they see a prompt first and can reveal the grounded answer.

**Pass:** front/back content comes from persisted Study Assets.
**Fail:** the app re-slices raw sentences on every render.

## AC-04 — Learn asks a real question

**Given** an active Learn session,
**when** StudyEngine selects the next concept,
**then** the response contains a learner-facing `question.prompt`.

For choice modes the response includes explicit options. The client must never display the internal engine instruction as the primary question.

**Automated gate:** `questionGenerator.test.ts`.

## AC-05 — Deterministic-first question path

**Given** a normal Learn/Test question,
**when** a question is created,
**then** wording/choices are produced deterministically from concept/source state without consuming an LLM token.

LLM escalation remains reserved for semantic grading or grounded Ask when deterministic confidence is insufficient.

## AC-06 — Configurable Practice Test

**Given** a learner opens Practice Test,
**when** they configure it,
**then** they can choose:
- question count;
- time limit;
- question-type mix on web;
- question count/time limit on Flutter.

The selected values must reach `StudyEngine.start`.

## AC-07 — Test integrity and final result

**Given** an active Test,
**when** the learner submits an answer,
**then** correctness feedback remains hidden until the session ends.

**When** the session ends,
**then** the UI presents the final score and weak concepts/review targets when available.

Existing StudyEngine test-mode tests remain required.

## AC-08 — Review uses the real schedule

**Given** a learner has concepts with `nextReviewAt`,
**when** Review is opened,
**then** the queue is loaded from `StudyEngine.dueReviews`.

**Fail:** labels such as "Due now", "Today", or "Tomorrow" are derived from array position.

Starting a due review must use the persisted concept/source context.

## AC-09 — Library is durable and searchable

**Given** a stable learner identity,
**when** a material is imported,
**then** the backend persists it in the learner-scoped material store.

**When** the library/search is opened,
**then** results are scoped to that learner and searchable by title/content.

The browser cache is fallback only; it is not the system of record.

**Automated gate:** `materialStore.test.ts`.

## AC-10 — Upload is real

**Given** an inline text file,
**when** it is sent through ingestion,
**then** the backend decodes and extracts its contents.

**Automated gate:** `ingest.test.ts`.

## AC-11 — Ask remains grounded and feeds study

**Given** a material and learner question,
**when** Ask returns an explanation,
**then** the answer stays grounded in that material and the UI offers a direct path back to Learn.

The existing extractive-first / LLM-escalation tests remain required.

## AC-12 — Security boundaries

- browser/Flutter clients never receive `INSTANTSTUDY_API_KEY`;
- material requests go through the BFF;
- account learner IDs require the account access token at the BFF;
- anonymous IDs use high-entropy generated identifiers;
- MCP remains bearer-authenticated;
- admin entitlements retain their separate credential.

## CI acceptance

Required green gates:
- TypeScript typecheck;
- deterministic intelligence tests;
- StudyEngine tests;
- Study Assets tests;
- Question Generator tests;
- Material Store isolation/search tests;
- inline ingestion tests;
- Paddle security tests;
- web build;
- Flutter `pub get`;
- Flutter `analyze`;
- Flutter tests;
- production dependency audit;
- OWASP Dependency-Check.

## Out of scope for this release

These are not required for Quizlet offer parity in the current wedge:
- Quizlet Live/classroom games;
- textbook solutions;
- teacher/class management;
- Family plan;
- public study-set marketplace;
- private Google Drive OAuth picker.

Private Drive OAuth is a separate integration because it requires Google OAuth credentials and consent. This release supports public/shared Drive file links rather than presenting a non-functional private picker.
