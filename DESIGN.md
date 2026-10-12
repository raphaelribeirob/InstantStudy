# InstantStudy™ — DESIGN.md

**Version:** 3.0 — Órbita / Refero editorial system
**Status:** Authoritative design contract for the Web/PWA Orbital-First product. Flutter parity is a separate task.
**Style reference:** https://styles.refero.design/style/031056ff-7af1-46db-8daa-115f731c5d26 (Refero's measured ElevenLabs design system).
**Orb reference:** https://smoothui.dev/docs/components/siri-orb (SmoothUI Siri Orb, MIT).
**Product:** InstantStudy. Do not copy ElevenLabs' name, wordmark, visuals, source components, licensed fonts, or exact page composition.

> **Product thesis:** Any material → adaptive practice → feedback → spaced review → knowledge you can retrieve.
>
> **Experience thesis:** A calm editorial learning environment with a living orb as the central interface — not a conventional SaaS dashboard.

## 0. Priority and legacy status

This document supersedes **Future of Learning v2** color, shape, typography, chrome and navigation rules. The former mineral-gray/orange dashboard treatments and strong indigo interactive buttons are **deprecated** for new UI. Learning workflows, API interfaces, security constraints, and acceptance documents remain in force.

A visual change does not authorize unreviewed learning-algorithm changes, hard-coded fake learner data, changing checkout behavior, exposing secrets, or claiming learning benefits without tests. The separate pedagogical upgrade now uses ts-fsrs for newly submitted reviews.

## 1. Visual language — light, warm, editorial

Warm paper, black typography, restrained surfaces, single colorful product visual. The **Siri Orb** is the place where color and motion belong. UI chrome is essentially monochrome.

Design goals:
- Editorial, not dashboard-heavy; product intelligence visible through restrained movement.
- Use whitespace and typography rather than tinted card stacks or saturated controls.
- Make learning and accessibility obvious with readable labels, not color-only cues.
- Consistent Web/PWA behavior at desktop, tablet and 360px mobile.
- A premium learning identity **inspired by** measured style attributes, not a brand clone.

## 2. Tokens

| Semantic token | Value | Usage |
| --- | --- | --- |
| `--study-eggshell` | `#fdfcfc` | Global canvas and primary elevated surfaces |
| `--study-taupe` | `#f5f3f1` | Feature bands, orbital stage, support panels |
| `--study-stone` | `#ebe8e4` | Hairline borders and subtle icon plates |
| `--study-ink` | `#000000` | Main text, filled primary buttons |
| `--study-graphite` | `#44403b` | Strong secondary labels |
| `--study-smoke` | `#777169` | Body text and explanatory copy |
| `--study-ash` | `#a59f97` | Optional metadata, never primary essential copy |
| `--study-violet` | `#0447ff` | **Orb graphics only** |
| `--study-orange` | `#ff4704` | **Orb graphics only** |
| `--study-focus` | `#000000` | Focus outline with sufficient offset on light backgrounds |
| `--study-radius-card` | `20px` | Standard content cards |
| `--study-radius-feature` | `24px` | Large stage/feature panels |
| `--study-radius-control` | `4px` | Text inputs, where rectangular fields aid scanning |
| `--study-radius-pill` | `9999px` | **All buttons, tabs, navigation chips** |
| `--study-max-width` | `1280px` | Desktop content frame |

Contrast exceptions:
- Orange/violet may appear **inside the rendered Siri Orb visual** and other non-interactive study illustrations, never as button fills, navigation outlines, text accents, action badges or status labels.
- Errors, successes and due reviews require a **written status**, not only a colored dot. Use neutral symbols + text for status; don't treat mastery as a medically or scientifically established probability.
- Dark focus/assessment mode is a purposeful **functional** exception. Keep controls neutral and accessible; don't turn the entire app into a permanent dark interface.

## 3. Typography

- **Display:** 300 weight, `Inter` Light with system fallback. The reference's Waldenburg is *not bundled or redistributed*; use only a properly licensed font if one is separately provisioned.
- **Headings 32px+:** 300 weight, line-height about 1.08–1.17, letter-spacing `-0.02em`. Avoid semibold display headings.
- **Body and navigation:** `Inter` 400 with 500 for CTA and emphasis. 14–16px copy with 1.47–1.6 line-height and slight +0.01em tracking.
- **Auxiliary labels:** 10–13px, short uppercase kicker labels or mono for data-only details. Avoid full sentences at 10px.
- **Responsive:** display scales from roughly 48px desktop to ~32px compact screens. Hero editorial text may scale beyond 48px only when carefully constrained.

Never imply that a font file has been installed when the app only uses a fallback.

## 4. Spacing, geometry, elevation

- 4px spacing system.
- Editorial sections: 96–125px vertical rhythm on marketing pages.
- 32px comfortable cards; 8–16px gaps between controls.
- Standard content cards: warm taupe, **20px** radius, minimal or no shadow.
- Large feature stages: **24px** radius.
- Navigation: 50–64px visual height, low chrome, hairline lower border where useful.
- Use `1px solid var(--study-stone)` dividers; elevation only when needed and never strong floating-card shadows.
- Black filled pill = primary CTA; eggshell outlined pill = secondary CTA. Do not use blue/orange fills for controls.

## 5. Components

### 5.1 Siri Orb (original SmoothUI)
- Use vendored `apps/web/src/components/smoothui/SiriOrb.tsx` under its original MIT notice.
- Retain its gradient motion, reduced-motion support and AI states `idle/listening/thinking/streaming/done/error`.
- Set product-visual palette from colors: blue `#0447ff`, orange `#ff4704`, and softer warm complementary tones. These colors **do not migrate into UI chrome**.
- No face or mouth, no fake speaking waveform. Microphone amplitude must be derived from real opted-in microphone input, never random amplitude disguised as a live signal.
- Orb is decorative where spoken and text UI already have labels; do not require users to read motion or hue for functionality.

### 5.2 Orbital navigation
- Center stage on taupe/eggshell with extremely subtle circular tracks.
- Eight primary mode buttons orbit the Siri Orb on wider screens. Mode buttons are black/eggshell with **pilled shapes**, using icons and legible labels.
- On small screens **hide dense orbit satellites** and show full-size labeled actions in the module list; never make tiny orbit buttons the only navigation.
- Every secondary mode routes to an existing workflow; mode entry must not suggest a backend is installed when it isn't.
- The persistent "back to orb" control is visible in learning workspaces.
- Existing classic navigation stays behind the accessible Tools drawer during the migration.

### 5.3 Content and assessment
- Library, guides, flashcards, Learn, Ask, Test, Review, podcast, Insights, game and Friends use the same taupe/eggshell materials.
- Cards: 20px radius; modal/hero panels: 24px.
- Tabs, chips and buttons: full pills; **inputs** can remain 4px.
- Practice Test must preserve timer and delayed correctness feedback; Orb remains unobtrusive during focused assessment.
- Learning feedback is textual and factually grounded; colored effects are never sole evidence of mastery.

### 5.4 Import, recording and voice
- Import UI supports paste, uploaded documents and audio using the existing ingestion pipeline.
- Browser speech recognition requires explicit user action and has a typed fallback. Disclose potential remote recognition by the browser provider.
- OpenAI Realtime WebRTC tutoring is implemented in the Web Orbital cockpit behind authenticated Plus/Unlimited entitlement and a configured backend feature flag. The voice tutor is **practice-only** and does not persist mastery or official scores; users still submit answers through the Study Engine.
- Release microphone tracks immediately when transcription ends or is cancelled.

### 5.5 Pricing and plugin surfaces
- Same black CTA and eggshell secondary CTA; no hard-paywall or price change is authorized by this design specification.
- Existing ChatGPT/MCP integrations use platform-specific host affordances. The full Web orb cannot be assumed to embed identically in host apps.

## 6. Web/PWA page composition

**First visit:** editorial headline → central Siri Orb with context-sensitive orbit mode labels → right-hand Today console (real reviews/materials/estimated mastery) → 3 softly separated feature sectors below.

**Focus mode:** contextual mini-orbit navigation → single readable task panel → data-driven feedback → return to orbit.

**Landing:** warm eggshell hero, whisper-weight heading, product sphere, large taupe feature scenes; avoid heavy grids and repeated saturated section fills. The app and landing should share exactly the same semantic tokens.

## 7. Responsive and accessibility

- 1280px max desktop content frame; breathing room with flexible margins.
- 1180px: stack stage and today console.
- 860px: collapse lower groups to two columns.
- 620px and smaller: one-column content; interactive orbit satellites hidden; full labeled mode actions; primary actions remain touch-friendly.
- Minimize animation and disable nonessential pulses with `prefers-reduced-motion`.
- Keyboard order independent of radial visual ordering; screen readers receive semantic text labels.
- Maintain reasonable text contrast. Low-contrast ash may label optional metadata only.
- Input fields and visible control focus must be readable on light and dark surfaces.
- Never make a color palette override alter security, authentication, learner data or payment behavior.

## 8. Engineering / validation contract

Source files:
- `apps/web/src/refero-theme.css`: shared semantic styles, appended at the end of the main entrypoint.
- `apps/web/src/orbital-focus.css`: sticky/stacking product orb and contextual scene layout (imported after the theme, only for orbital layout).
- `apps/web/src/orbita-system.css`: orbit-specific geometric layout before the reference theme overrides.
- `apps/web/src/orbita.css`: active review surface and speaking state behavior.
- `apps/web/src/software.css`: existing study tools and navigation.
- `apps/web/src/styles.css`: landing and foundational typography.
- `docs/ORBITAL_OS_ACCEPTANCE.md`: explicit workflow routes and functionality boundaries.

Verify on PR:
1. Match eggshell/taupe/stone/ink tokens and reserve colorful sparks to orb illustrations.
2. Headings 300/-0.02em, pilled actions, hairline dividers, 20/24px panels.
3. All orbital routes retain working original functionality; Review/Insights data is real.
4. 360px, 768px, 1280px responsive controls and no horizontal overflow.
5. Reduced-motion and keyboard navigation.
6. Typecheck, tests, Web build, Flutter CI unaffected, OWASP dependency checks.
7. Manual screenshot comparisons; automated compilation alone does **not** prove design fidelity.

## 9. Explicit non-goals

No copying ElevenLabs text/assets/identity; no redistribution of Waldenburg fonts. No fake "retention percentage" claim, unverified historic-FSRS migration, ChatGPT hosted voice guarantee, OpenAI-hosted grading tools, new app store payment changes, or claiming Flutter native SiriOrb/Realtime parity.


## 10. OpenAI Realtime — voice tutor connection

- Only initiate a real WebRTC session on explicit **Speak with OpenAI** user action; microphone permission requires a user gesture.
- Route SDP through `/api/study` → authenticated paid learner validation → bearer-protected Study API → `POST /v1/realtime/calls` from the backend. `OPENAI_API_KEY` never goes to Web/PWA source or network response.
- Scope the tutor to a limited excerpt of the selected learner material, treat it as untrusted, prompt one Socratic question at a time, and never imply spoken feedback writes grades, durable memory or scheduled reviews.
- Voice output and audio input use negotiated WebRTC media tracks. The Siri Orb reacts to actual analyser amplitude. Navigation by Web Speech API remains a distinct, optional feature.
- Session startup requires `INSTANTSTUDY_REALTIME_ENABLED=true`, configured OpenAI credentials, a paid signed-in account, and durable per-user daily admission quota in Neon. Fail closed on missing identity, entitlement, flags, key or quota storage.
- Client ends/cleans tracks after **3 minutes**. This is a client-side safeguard, not a provider-enforced hard spend cap; operate with OpenAI project limits and usage alerting. Starting a voice session may incur charges.
- Color/motion and status text follow this DESIGN.md; the voice controls remain eggshell/taupe/black. Offer an error fallback that leaves normal study features usable.
- Native Flutter WebRTC parity and automated attribution of voice practice to the Study Engine require separate projects.

## 11. Unified Orbital APP — Web/PWA + Flutter

The Orb is **not merely a link menu**. On Web/PWA, the actual React SmoothUI Siri Orb now stays mounted and visible as a study companion while the contextual learning workspace changes. On large screens it occupies a persistent taupe sidecar alongside the active tool. On phones the focused Orb stage stacks above the active learning panel and the compact mode rail remains available for navigation.

### Voice-driven tool navigation

OpenAI Realtime includes precisely two allowlisted function tools:
- `open_study_mode`: **low-risk navigation only** to one of the 15 pre-existing InstantStudy modules. A spoken command opens the visible contextual scene; no backend write is performed by this tool. The voice session remains connected while navigating, subject to the independent 3-minute client timer.
- `get_study_context`: read-only currently selected material, due concept count, library count and **estimated** mastery.

Do **not** grant Realtime a tool that directly updates mastery, issues charges, shares documents, starts unsolicited recording, or bypasses the Study Engine. Starting Learn/Test/Review through the UI still uses authenticated backend endpoints. The student explicitly submits answers.

### Native Flutter visual identity

- `apps/flutter_app/lib/orbital_home.dart` is the default launch screen. Orbital home displays a native animated, abstract gradient sphere in blue `#0447ff`/orange `#ff4704` inside warm taupe tracks, prominent 300-weight heading, black filled pill CTA, and a 12-mode accessible touch grid.
- The Flutter gradient sphere is an **independent native interpretation** of the Refero/SmoothUI visual style. It is **not** the identical React SiriOrb, and it is not microphone-reactive.
- Native feature scenes retain the small Orb and return-to-orbit control. Guide, flashcards, Ask, due reviews, library, Learn, Quiz, Tests, Podcast, insights, game and study room reuse the existing study API. Never imply that flashcard flip alone updates mastery.
- Native learner ID is saved locally and must be restored between runs, but this is not cross-device account sync.
- No native Realtime WebRTC/voice tutor should be claimed until implemented and verified on both iOS and Android. File/audio import is not native live lecture recording.
- All typography, radius and background decisions follow the palette above; dark assessment panels are a functional exception.

### Release checks

1. Opening the Web or native app shows an Orb as the primary product surface.
2. Starting any supported study feature changes the contextual scene **without losing** the orbital identity.
3. Flashcards, guides, tests, podcasts, Ask, reviews, room sharing and Insights all use real learner material and existing backend operations; no invented progress.
4. Keyboard/touch hit areas are accessible on 360px mobile and phone layouts; radial satellites can disappear in favor of readable controls.
5. Flutter widget tests use finite `pump` cycles, not `pumpAndSettle` on the continuously animated native sphere.
6. Record visual QA, API-level validation, consent, entitlement checks and app-store readiness separately from compiler/test success.

## 12. Sensor Tower / Quizlet pedagogy and recording upgrade

- Study cards and source-grounded guides use the **free-first Groq → OpenRouter → Gemini** LLM router only when the operator enabled it and actual provider keys are present. The result is validated against source evidence and a durable daily Neon quota; invalid/unavailable results fall back to deterministic materials. Paid OpenAI text inference requires a separate explicit opt-in. See `docs/FREE_LLM_PROVIDERS.md`.
- Normal Learn, Quiz and Test pass the grounded flashcard prompts into the Study Engine. Objective answer choices are checked against a source-backed correct statement, not rewarded for superficial word overlap.
- New review attempts are scheduled by `ts-fsrs` and serialized with each concept. Legacy dates remain as saved until that concept is next reviewed; no invented prior history.
- Large recordings of up to 25 MB use authenticated, paid Web/PWA chunking with bounded Neon staging. The native Flutter app still has the smaller legacy limit. Uploads expire after 24 hours and must not be claimed to support arbitrarily long lectures.
- Existing audio podcasts remain scripted/browser TTS; they are not downloadable audio episodes. Existing game/social mechanics remain limited; no parity assertion should overstate them.
- The embedded Review hides its duplicate orb to keep only one main voice sphere within the focus layout.
- These engineering changes do not authorize production activation or claims of human-tested Quizlet equivalence.


### Awesome Free LLM APIs provider routing — October 2026
- The Awesome catalog is a reference, **not** a unified free API or license to redistribute keys.
- Back-end text calls prioritize configured Groq, OpenRouter `:free` and Gemini provider endpoints; the router accepts only allowlisted hosts and operator-selected model IDs.
- PDF/text extraction remains local on the API; generated cards, guides, Ask, grading, audio transcription and photo OCR may call configured external free-tier providers. Student content must not be sent before privacy disclosure/consent review.
- **No automatic billable fallbacks:** OpenAI text, Whisper/audio and image OCR all require separate `INSTANTSTUDY_ALLOW_PAID_*` switches; the existing OpenAI Realtime voice still has separate paid entitlement and configuration.
- Preview environment enables routing switches only; no Groq/OpenRouter/Gemini keys have been supplied, so calls fall back to deterministic/unsupported states rather than pretending to be connected.
- See `docs/FREE_LLM_PROVIDERS.md` for setup, provider restrictions, safe limits and end-to-end acceptance.

## 13. Oferta agêntica — uma Órbita, ferramentas reais do Quizlet

Use the audited Quizlet/Sensor Tower advertised learning capabilities as the complete *product taxonomy* rather than designing arbitrary agent personalities. One persistent Siri Orb coordinates nine bounded actions (guide, flashcards, Ask, Learn, Test, Review, Podcast, Game and Friends). Audio Recording enters through the existing Import flow and automatically creates the study materials.

The Orb's **agentic goal console** appears inside the existing Refero/ElevenLabs-inspired editorial sidecar. It accepts a learner-owned goal, optional deadline and selected source material; displays the current recommendation and real stored plan progress; and opens the actual learning module on demand.

**Visual rules:**
- A single gradient Orb stays central and microphone-reactive only while a real voice session is active.
- Agent specializations do not need separate avatars, faces, mouths, new brand colors or different Orb meshes.
- A planned action is not a recorded learning accomplishment. A click to explore a guide/audio/game may be acknowledged, but can NEVER increase mastery.
- Learn/Test/Review milestone completion requires a validated, completed, nonempty graded Study Engine session after plan creation. User-facing proof errors must be truthful.
- The currently suggested action is emphasized with black/eggshell pill CTA; a secondary outlined pill acknowledges exploration or submits legitimate graded proof. Progress remains monochrome/blue and accessible.
- On desktop the goal console is within the existing sticky Orb panel, on phones it stacks above the active study scene, without two simultaneous Siri Orbs.
- Persist plan only via authenticated API and Neon; no frontend database secret and no browser-only "AI memory."
- No fabricated accuracy, retention probability, background push alerts or autonomously recorded voice scores.

See `docs/AGENTIC_OFFER.md` for precise offer mappings, server ownership rules, and future acceptance criteria. This implementation is a **bounded agentic workflow**, not yet a general-purpose multi-agent autonomous tutor, and must not be marketed as equivalent to Quizlet in depth without real-user QA.


## Launch logo motion — InstantStudy™ → IStudy™

- This **one-shot opening transition** applies to the installed Web/PWA app route `/app` and the native Flutter launch, not to the marketing site or in-study scene switches.
- Start with the **InstantStudy™** black-on-eggshell outlined horizontal capsule. After a short hold, compress the pill horizontally while the full wordmark resolves into **IStudy™**; keep the trademark in superscript. The endpoint capsule is visibly shorter.
- Approximate total screen occupancy: 1.6–1.83 seconds including fade in the Web; about 1.6 seconds native. The user may skip at any time. On reduced-motion devices, show the final mark briefly without the animated morph.
- Use in-app text/vector effects rather than rendering the storyboard or GIF as a fixed image. **The entire opening wordmark uses League Spartan Regular 400**, including `InstantStudy™`, `IStudy™` and the superscript trademark. No 500/Medium span is allowed in the intro.
- The official variable font and SIL OFL-1.1 license are bundled locally at `apps/web/public/fonts/` and `apps/flutter_app/assets/fonts/`. Web splash preloads the local font; Flutter registers `LeagueSpartan` in `pubspec.yaml`. Do not change the app-wide Inter editorial typography.
- The splash must **not mount a second Orb**, alter the existing Siri Orb code, reset a learning session, access user data, change billing or inject any third-party dependencies. Underlying study app stays mounted and cannot receive taps until the animation finishes or is skipped.
- The product brand remains **InstantStudy™** throughout menus, metadata, accessibility naming and billing; `IStudy™` is only the compact finishing signature, not a product rename.
- Implementation: `apps/web/src/StudySplashIntro.tsx`, `apps/web/src/study-splash.css`, `apps/flutter_app/lib/study_splash_intro.dart`; wrapper activation in each app's `main` file. See `docs/SPLASH_MOTION_ACCEPTANCE.md`.

