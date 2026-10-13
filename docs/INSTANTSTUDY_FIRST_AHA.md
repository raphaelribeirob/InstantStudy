# InstantStudy — first verified learning value (AHA)
Date: 2026-10-12 | Status: development branch, **NOT production certified**.

## Real product journey
1. Landing generator buttons route to `/app?start=<paste|upload|drive|audio|scan>`. They never upload before payment.
2. HardPaywallGate verifies an active paid account; no free study mode or bypass is introduced.
3. When authenticated library is empty, open the source selector immediately instead of an empty features menu.
4. Import real learner material; generation starts a Learn session automatically.
5. First low graded answer triggers a source-backed explanation and explicit retry on the **same concept** in written recall mode.
6. High-confidence improved score on this concept returns an AHA evidence object with actual before/after.
7. If the first two correctly graded concepts are different and both confidently strong, display *demonstrated initial proficiency*, not an invented improvement.
8. Learners with no result yet keep studying; no fake AHA is awarded.

## Server definition of first value
- `learning_aha_achieved` recovery: first earlier attempt on same concept with weighted score below .65, later weighted score at least .82, completeness at least .75, confidence at least .80, difference at least .30. Not recorded for Practice Test.
- `learning_aha_achieved` demonstrated_mastery: the first **two** different concepts have weighted scores >= .82 and grader confidence >= .80, with complete last answer. Not a claim of long-term retention.
- A single response does not qualify. The event is calculated in StudyEngine after saving the graded attempt. No client input or model text can create an AHA event.
- Not equivalent to educational efficacy; that requires retention testing days later.

## Event funnel (backend-only)
Server emits: `study_material_imported`, `first_question_prepared`, `first_answer_graded`, `learning_gap_detected`, `learning_gap_retested`, `learning_aha_achieved`.
- *Prepared* means backend generated the question. It does **not** prove the client rendered it. A future `first_question_presented` event requires authenticated client display instrumentation.
- Use the verified `learning_aha_achieved` event as activation numerator; denominator is new paid accounts imported successfully. Segment by source type/device/locale only where actually captured.
- Landing dispatches existing `instantstudy:marketing` event and dataLayer `landing_import_intent`; does not claim paid activation.

## PostHog configuration (must be explicitly supplied at deploy — GitHub-only changes cannot activate it)
- `INSTANTSTUDY_POSTHOG_PROJECT_KEY`: project write token, stored server-side.
- `INSTANTSTUDY_POSTHOG_ID_SALT`: separate random >=32-character secret, do not reuse database credentials.
- `INSTANTSTUDY_POSTHOG_HOST`: `https://us.i.posthog.com` or `https://eu.i.posthog.com`.
- Disabled without key + salt. Never send learner email, names, uploaded content, answers, raw user ID, source material IDs, session IDs or source excerpts.
- Event `distinct_id` is HMAC-SHA256 of verified account ID; event payload contains only whitelisted numeric/enum properties. Person profiles are disabled.
- Evaluate consent, retention window and LGPD policy before turning on real-world analytics. No autocapture or session replay enabled by this PR.
- Analytics network errors are nonfatal and never determine grades. Capture adds up to 650ms per configured request; benchmark and optimize ingestion before production rollout.

## Acceptance matrix
- [x] Landing source CTA leads to paid entry, without pretending to import.
- [x] First paid study material routes to first question.
- [x] Wrong answer -> source evidence -> short-answer retest on same concept.
- [x] AHA triggered only by persisted, confidence-gated graded attempts.
- [x] Correct-on-first answer still needs second concept to qualify.
- [x] Hard paywall remains a prerequisite; no preview of paid engine.
- [x] Server event tracking avoids sensitive study content.
- [ ] Live PostHog project credentials/consent and verified ingestion.
- [ ] Browser real-device E2E/visual/accessibility tests.
- [ ] Metrics from actual student cohorts (time to first question, time to AHA, adoption and D7 retention).
- [ ] Independent pedagogical evaluation of AI grading precision and content quality.
- [ ] PR dependency chain merged and production tests certified.
