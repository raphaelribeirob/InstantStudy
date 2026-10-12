# InstantStudy editorial Motion — design contract

Reference: https://styles.refero.design/style/031056ff-7af1-46db-8daa-115f731c5d26
Primary tools: installed `motion/react`, CSS transitions, built-in Flutter implicit animation.
Inspired by ElevenLabs UI's *style and rhythm*, not any proprietary ElevenLabs asset or animation source.

## Scope
- Landing: calm, one-time viewport reveal of key copy and product sections.
- Navigation: 160–240ms opacity/8–12px y transition, persistent Siri Orb never unmounted by view changes.
- Paywall: low-motion transitions between checking/welcome/plan/error; no unauthorized app flash.
- Learning: answer/feedback/status changes use short opacity, never animated correctness or score alteration.
- Interactive cards/tabs: restrained hover/focus states; no constant motion.
- Splash: keep the existing InstantStudy™ → IStudy™ League Spartan 400 opening unchanged.
- Flutter: add subtle page-level transitions with accessibility-aware duration; no second orb.

## Motion tokens
- fast 160ms; standard 240ms; deliberate 340ms; reveal 420ms
- ease cubic-bezier(.22,1,.36,1)
- opacity/transform only for transitional content, no page-scale transforms
- no parallax, strobing, infinite shimmer, auto-playing ambient animations, or JS scroll traps

## Mandatory acceptance
1. Browser prefers-reduced-motion: no spatial movement or hover lifts, no content hidden behind nonessential animation.
2. Keyboard focus/labels remain available, inputs retain values, anchored sections keep their IDs.
3. Hard paywall rejects unauthorized users **before** mounting the learning UI. Motion never delays revocation.
4. View changes do not unmount/reinitialize the persistent Siri Orb or server study session state.
5. Web typecheck/tests/build + Flutter analyze/tests + OWASP run in CI.
6. Small-screen browsers with low resources: no jitter from animated height/width/box-shadow loops.
7. No claim of Pixel-Perfect ElevenLabs parity; proprietary 3D orb and audio components are not copied.

## Coverage warning
This contract addresses interface motion only; it does not certify the 48-item Quizlet offer or production billing, native purchase, translation or live QA.
