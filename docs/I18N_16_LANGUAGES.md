# InstantStudy — 16-language scope

Supported: Dutch (nl), English (en), French (fr), German (de), Indonesian (id), Italian (it), Japanese (ja), Korean (ko), Polish (pl), Portuguese (pt-BR), Russian (ru), Simplified Chinese (zh-CN), Spanish (es), Turkish (tr), Ukrainian (uk), Vietnamese (vi).

## Implemented on PR #32
- Web locale dropdown, persistence and fallback; Flutter locale picker and persistence.
- Essential interface labels and navigation translations; new locale packs are not yet complete.
- Selected locale forwarded to backend and persisted on study sessions.
- Localized deterministic question prompts and true/false answer labels for 16 locales.
- Localized study podcast scripts and TTS voice-language selection.
- Spanish/Japanese prompt coverage and Flutter locale tests.

## Release gates not yet met
- Full translations for every screen, error, checkout and accessibility label; professional review by native speakers.
- Multilingual source interpretation, Ask, answer feedback, MCAT terminology, CJK segmentation and source-dependent flashcard generation.
- TTS voice and pronunciation availability across devices; audio background handling.
- E2E language and layout snapshots; locale-specific formatting, pluralization and a11y checks.
- Production deployment must match CI-approved Git SHA; known production Neon/OpenAI configuration gaps persist.

**Status:** 16 locales selectable with core navigation, prompts and podcasts. Not 16 fully localized end-to-end curricula or apps.
