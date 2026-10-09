# InstantStudy™ — Canonical Refero ElevenLabs design system

**Reference:** https://styles.refero.design/style/031056ff-7af1-46db-8daa-115f731c5d26  
**Applied:** 2026-10-08  
**Brand:** Independent InstantStudy™ identity, **not** a copy of ElevenLabs or Quizlet assets.

## Purpose
Warm editorial AI-native learning with black-ink controls, cream paper surfaces, restrained movement and clear active-recall workflows. Consistent tokens for marketing, Web application and Flutter.

## Exact color tokens
| Token | Value | Role |
|---|---|---|
| Eggshell | `#fdfcfc` | page/canvas |
| Warm Taupe | `#f5f3f1` | grouped surfaces/sidebar |
| Stone | `#ebe8e4` | one-pixel borders |
| Ink | `#000000` | primary ink, buttons, controls |
| Graphite | `#44403b` | secondary labels |
| Smoke | `#777169` | body and muted text |
| Ash | `#a59f97` | tertiary |
| Violet Spark | `#0447ff` | product art/orbs only |
| Ember Orange | `#ff4704` | product art/orbs only |

Semantic error/success indicators must also use readable text/icons. No colored primary CTAs.

## Typography
- Display: Waldenburg Light 300 if licensed, otherwise **Inter Light 300/system**. No redistribution of proprietary fonts. At 32, 36 and 48px: tracking -0.02em; line-height 1.08–1.17. Responsive hero may scale larger.
- Interface: Inter/system, 400 default/500 emphasis; line-height 1.47–1.6; +.01em tracking for 14–16px.
- Code: Geist Mono or system monospace.

## Components and spacing
- Base unit 4px; content max width 1280px; section gap 96–125px on desktop.
- Cards 20px radius, feature surfaces 24px, inputs 4px; **buttons, tabs, tags 9999px pill**.
- Primary action filled #000 with #fdfcfc text; secondary action eggshell with stone hairline border.
- Prefer clean borders instead of shadows or gradients. Orbs are the only violet/orange visual moments.

## Motion and accessibility
- 120–320ms subtle transitions; never bouncing controls; respect reduce-motion preference.
- Visible keyboard focus, 44px tap targets for primary controls where possible.
- Responsive Web / Android / iOS; preserve iOS safe area, don't hide action buttons below floating navigation.

## Product contract
Import -> grounded study guide / flashcards -> adaptive Learn / Test -> spaced Review -> honest Insights -> persistent learner history. No simulation marketed as fully tested. Show recoverable failure if backend unavailable.

## Release gates
- Web / Flutter responsive snapshots against Refero tokens.
- CI typecheck, tests and build all green.
- Capture permission, account continuity, all study modes, and payments verified on physical devices.
- Production deployment must match tested Git SHA.
