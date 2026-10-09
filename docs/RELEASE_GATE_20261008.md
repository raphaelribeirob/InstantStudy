# InstantStudy™ — Release gate / blockers (2026-10-08)

**Canonical design:** https://styles.refero.design/style/031056ff-7af1-46db-8daa-115f731c5d26

## Implemented on the PR branch
- Refero/ElevenLabs-inspired DESIGN.md and Web/Flutter color tokens; independent assets
- Browser microphone policy allows same-origin permission
- Flutter local anonymous ID persists across restarts
- Grounded cloze flashcards, Portuguese questions, true/false and multiple-choice scoring server-side
- Contradiction-sensitive grading; test source excerpt is not returned in test mode
- Delayed recall replaces inferred mastery shown as retention
- Portuguese podcast scripts and TTS locale selection
- Flutter HTTP client supports Flutter Web; automated Web and Android debug build gates

## Still blocked on production credentials, infrastructure or independent proof
1. **Production Neon:** no DATABASE_URL was present in the accessible production-scoped Vercel API environment listing. Provision the intended production branch/database, apply migrations and backups.
2. **Production OpenAI:** no OPENAI_API_KEY was present in that listing. Image OCR, lecture transcription and semantic fallback need production credentials, spend limits and logging/PII policy.
3. **Production deploy:** pin production to the same commit that passed CI. Prior attempts showed Vercel quota/rate-limit failures; preview READY does not equal production up to date.
4. **Long lecture (P0):** inline upload currently has a 2.5 MB limit. Implement authenticated private resumable object storage, async transcription queue, job state and retry; prohibit public URL storage for private student recordings.
5. **Cross-device identity (P0):** Flutter local learnerId persistence is not sign-in. Complete Instant Account OAuth, verified session binding, secure anonymous-account merge and recovery.
6. **Native payments (P0):** App Store/Google Play subscriptions and restores must be integrated using store-compliant native flows; no real transaction verified.
7. **Google Drive:** configure OAuth Picker on Web and platform-specific OAuth/deep links on Android/iOS; verify private imports.
8. **Security:** OWASP dependency checks passing do not prove no IDOR, SSRF, API abuse, or billing fraud. Run deployed API tests.
9. **Pedagogy:** 100 varied source files need human-graded evaluation for fidelity, difficulty, distractors, exam integrity; later-day retention tracking needs real cohorts.
10. **Mobile release:** test signed iOS and Android packages, permissions, all screen sizes, accessibility and native background audio behavior.
11. **Social and game:** multiplayer authorization, achievement fairness, and user-level outcomes need further validation.

## Do not release as "Quizlet parity" until
- all CI + security checks are green for the exact published SHA;
- production API and Web smoke tests pass with a real registered learner;
- a 60-minute audio job survives browser closure and private files never become public;
- purchases and restoration are tested in provider sandboxes;
- history survives account login on a separate device;
- educational scoring has no high-confidence false positives in a dedicated adversarial benchmark.

Definitions of acceptance describe requirements, not completion. Keep this PR draft until its production and operational checks are satisfied.
