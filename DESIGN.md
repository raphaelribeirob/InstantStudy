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

A visual change does not authorize rewriting Study Engine scheduling, importing additional tracking libraries, using hard-coded fake learner data, changing checkout behavior, exposing secrets, or claiming OpenAI Realtime/FSRS functionality before integration.

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
- OpenAI Realtime duplex speech is **not delivered** merely by rendering the Siri Orb.
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

No copying ElevenLabs text/assets/identity; no redistribution of Waldenburg fonts. No fake "retention percentage" claim, FSRS migration, ChatGPT hosted voice guarantee, Realtime voice installation, new backend data models, app store payment changes or Flutter native parity as side effects of this design change.
