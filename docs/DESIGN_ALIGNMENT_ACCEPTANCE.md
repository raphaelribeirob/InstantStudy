# DESIGN.md Alignment — Acceptance Criteria

This release closes the visual gaps found between the canonical `DESIGN.md`, the marketing landing page, the Web software and the Flutter client.

## AC-01 — One token system

All InstantStudy surfaces use the canonical tokens from `DESIGN.md`:

- ink `#11110f`
- paper `#f2f0ea`
- paper-2 `#e9e7e1`
- paper-3 `#dedbd3`
- orange `#e36232`
- orange-soft `#f1a06f`
- electric `#5b6cff`
- green `#98bd9d`

The Web software must not introduce a second blue/orange identity.

## AC-02 — Shared InstantStudy orb

Landing, Web software and Flutter use the same visual orb grammar:
- neutral mineral base;
- electric memory lobe;
- orange attention lobe;
- state variations for Test, Review and mastery.

## AC-03 — Software is not dashboard-first

On desktop, `/app` uses an editorial horizontal masthead instead of a permanent SaaS sidebar.

Primary content uses:
- bands;
- thin rules;
- square/lightly rounded surfaces;
- monumental headings;
- mixed dark/light scenes.

Rounded cards cannot be the default hierarchy mechanism.

## AC-04 — Learning scenes carry semantic color

- Learn/question focus → near-black.
- Test focus → near-black.
- Review/due state → burnt orange.
- Mastery/memory → electric indigo.
- Stable knowledge → green.
- Infrastructure/connection → black.

## AC-05 — Insights is a knowledge-state scene

Retention Insights must not render as a generic six-card analytics dashboard.

The scene must prioritize:
1. overall mastery;
2. retention;
3. due concepts;
4. weak concepts;
5. recent activity.

Charms remain secondary and restrained.

## AC-06 — Audio Study is cinematic

Audio Study uses a dark focus scene with:
- title;
- playback action;
- transcript;
- active-recall interruptions.

It must not read as two generic white cards.

## AC-07 — Study With Friends is a shared-progress scene

Rooms prioritize:
- room code;
- shared material;
- members;
- linear progress;
- study-together action.

Setup may use forms, but joined state must feel like one shared system rather than a card dashboard.

## AC-08 — Motion is signal propagation

Allowed motion:
- large-type reveal;
- product fade-in;
- orb state transition;
- mastery/progress propagation.

Disallowed motion:
- bounce;
- confetti;
- floating-card spectacle.

Web respects `prefers-reduced-motion`.
Flutter respects the platform `disableAnimations` preference for state transitions.

## AC-09 — Mobile navigation exposes every product surface

No mobile nav item may be hidden by positional CSS selectors.

The mobile navigation rail must allow horizontal access to:
- Home;
- Library;
- Guide;
- Flashcards;
- Learn;
- Test;
- Ask;
- Review;
- Insights;
- Audio;
- Friends;
- Plugin.

## AC-10 — Flutter is an InstantStudy surface, not stock Material UI

The primary Flutter flow must not rely on stock:
- `AppBar`;
- `SegmentedButton`;
- `AlertDialog`

as its dominant product language.

Instead it uses:
- InstantStudy masthead + orb;
- paper/mineral canvas;
- subtle custom grain;
- line-based controls;
- monumental entry typography;
- near-black study scene;
- dedicated Retention Insights scene.

Material primitives may remain underneath where appropriate for accessibility and platform behavior.

## AC-11 — Landing reflects the installed offer

The landing material generator includes photographed/scanned notes.

The launch page may remain concise, but it must acknowledge retention and collaborative study capabilities now present in the product.

## AC-12 — Validation

Required green gates:
- TypeScript typecheck;
- Node tests;
- Web build;
- production dependency audit;
- Flutter `pub get`;
- Flutter `analyze`;
- Flutter widget tests;
- OWASP Dependency-Check.
