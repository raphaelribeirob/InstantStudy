# Quizlet-style Offer Layer — Acceptance Criteria

This release reproduces validated study mechanics without copying Quizlet trademarks, copy, private code, or proprietary assets.

## Product thesis

Any material → structured study assets → adaptive Learn/Test/Review → retention insights → repeatable mastery.

## AC-01 — Photo and handwritten-note input

Given a learner has a photo of notes,
when the learner uploads or captures an image,
then InstantStudy sends the image through the secure server-side ingestion pipeline.

Image text extraction:
- uses vision only for image inputs;
- requires the server-side OpenAI credential;
- returns `host_text_required` when vision is not configured;
- never exposes the provider credential to Web or Flutter;
- feeds extracted text into the same deterministic Study Assets/StudyEngine path.

Web exposes a camera/photo input. Flutter accepts PNG/JPG/JPEG/WebP files.

## AC-02 — Retention Insights are derived from real learning state

Insights must be calculated from persisted StudyEngine sessions, not counters stored only in the UI.

Required metrics:
- sessions/completed sessions;
- active-recall attempts;
- minutes studied;
- average mastery;
- retention score;
- concepts due now;
- current streak;
- last 7 days activity;
- strong concepts;
- weak concepts.

## AC-03 — Charms are earned, not manually toggled

Charms are deterministic achievements derived from learner history:
- first completed session;
- 3-day streak;
- 50 answers;
- 80% average mastery across at least three concepts.

## AC-04 — Audio Study is grounded in saved material

Given a saved material,
when Audio Study is opened,
then the backend creates a deterministic guided-review script using the material's persisted summary, outline, and key concepts.

The script must:
- identify the source title;
- recap key ideas;
- include active-recall pauses;
- end with a retrieval practice instruction.

The Web client can play the script with device speech synthesis without a separate LLM/TTS call.

## AC-05 — Study Rooms are learner-scoped and durable

A learner can create a room from a material and receive a short join code.

A second learner can join by:
- join code;
- display name;
- their own verified learner identity.

Room state includes:
- shared material title/summary/concepts;
- members;
- per-member progress;
- per-member answer count.

Production rooms are stored in Neon. Local development may use memory when durable storage is explicitly disabled.

## AC-06 — Room progress comes from study behavior

When a room member submits answers in Learn/Test,
then room progress is updated from the actual StudyEngine question index/session completion state.

A room joiner can study the shared room material even if they do not own the host's Library record.

## AC-07 — Security boundaries

- privileged InstantStudy API key stays in the BFF;
- image/provider credentials stay server-side;
- account learner IDs continue to require account bearer verification at the BFF;
- Study Rooms expose only intentionally shared summary/concepts, never host credentials;
- production Room persistence follows the same fail-closed Neon policy as the rest of InstantStudy.

## AC-08 — Flutter minimum parity

Flutter must:
- accept image/handwritten-note file types;
- keep file upload secret-free through the BFF;
- display Retention Insights;
- expose client methods for Audio Study and Study Rooms.

## AC-09 — Automated gates

Required green gates:
- TypeScript typecheck;
- all Node tests, including offer-layer and Study Room tests;
- Web build;
- production dependency audit;
- Flutter pub get;
- Flutter analyze;
- Flutter tests;
- OWASP Dependency-Check.

## Explicitly not copied

This release does not copy:
- Quizlet brand, icons, screenshots, marketing copy, source code, or proprietary datasets;
- Quizlet Live implementation;
- textbook solutions;
- their public study-set marketplace.

The benchmark is the validated learning loop and commercial product mechanics, implemented independently inside InstantStudy.
