# InstantStudy i18n — Acceptance Criteria

This release makes internationalization a product primitive across Web and Flutter.

## AC-01 — Canonical locales

Initial supported locales:
- English (`en`) — fallback/default;
- Brazilian Portuguese (`pt-BR`).

Unsupported locales resolve to English. A device/browser configured for Portuguese resolves to `pt-BR`.

## AC-02 — Web runtime

Web uses:
- `i18next`;
- `react-i18next`.

Requirements:
- i18n initializes before React renders;
- browser locale is detected without a third-party detector;
- explicit locale selection is persisted to `instantstudy.locale`;
- `document.documentElement.lang` follows the active locale;
- missing strings fall back to English;
- student material is never machine-translated implicitly.

## AC-03 — Web language control

Landing and software expose an EN/PT selector.

Changing language:
- updates the active UI immediately;
- persists for the next visit;
- keeps the same route, study material and learning state.

## AC-04 — Web product surfaces

The translation catalog covers the core user journey:
- landing generator and pricing labels;
- software navigation;
- Home and Library;
- material creation;
- Study Guide / Flashcards / Learn / Practice Test / Ask;
- Review;
- Retention Insights;
- Podcast;
- Study Game;
- Study With Friends;
- Family;
- Plugin shell.

Dynamic learner content remains in its source language.

## AC-05 — Locale-aware formatting

Dates and visible counters that support locale formatting use the active locale rather than a hard-coded US locale.

## AC-06 — Flutter runtime

Flutter uses the SDK `flutter_localizations` mechanism and an InstantStudy localization delegate.

Requirements:
- supported locales match Web;
- OS locale is used when no explicit choice exists;
- language choice is persisted locally;
- a language control switches EN ↔ pt-BR without restarting the app;
- Material widgets receive Flutter's locale delegates.

## AC-07 — Flutter product surfaces

Core Flutter UI uses translation keys for:
- entry/hero;
- material form;
- study mode controls;
- question actions;
- summary;
- Insights;
- Podcast;
- Study Game.

Learner-provided/source-generated study content is not translated automatically.

## AC-08 — Persistence

Web persists locale in localStorage.
Flutter persists locale in `shared_preferences`.

Locale preference is presentation data only and must not be treated as authentication or learning-state authority.

## AC-09 — Extensibility

Adding another locale must require:
1. adding it to supported locales;
2. adding one translation resource/catalog;
3. no component duplication.

## AC-10 — Validation

Required green gates:
- TypeScript typecheck;
- Node tests;
- Web build;
- production dependency audit;
- Flutter dependency resolution;
- Flutter analyze;
- Flutter widget test including EN → pt-BR switch;
- OWASP dependency check.
