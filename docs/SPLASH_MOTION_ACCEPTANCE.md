# Startup capsule motion — acceptance criteria

Reference: the user-supplied InstantSpeak™ → ISpeak™ animated GIF. InstantStudy uses the same motion logic adapted to `InstantStudy™ → IStudy™`, with **one capsule, no secondary Orb, no GIF-frame dependency**.

## Intended behavior

1. Opening the **Web/PWA app** at `/app` (including deep links `/app/*`) displays a white/eggshell full-screen capsule splash above the existing app. The marketing page is unaffected.
2. Native Flutter app displays its own matching capsule opening before allowing user interaction with the Orbital home. `StudyHome` is not remounted or recreated after the intro.
3. The initial capsule reads **InstantStudy™**. It narrows as the long wordmark fades/compresses into **IStudy™**, which stays sharp and centered before the app appears.
4. Initial `Instant` is weight 400, `Study` is weight 500, final `I` weight 400; preserve a small superscript trademark and the black outline on eggshell.
5. Approximate duration: Web 1.60s morph + 0.23s overlay fade, Flutter 1.60s. Manual **Skip** dismisses immediately without changing route.
6. The UI underneath the splash cannot be clicked or navigated by accessibility focus. On Web this uses `inert`; on Flutter the gate absorbs pointers and excludes the learning app from accessibility semantics while open.
7. `prefers-reduced-motion: reduce` on Web disables morph and exits quickly. Flutter's `MediaQuery.disableAnimations` causes immediate dismissal.
8. Existing Siri Orb/voice lifecycle, source upload, tests/quiz/reviews, Neon, payment and LLM routing remain unchanged.
9. Logo/brand in app metadata and checkout remain **InstantStudy™**; `IStudy™` is not a rename of the product.

## Automated verification

- Flutter widget test: asserts that the splash is present at startup, disappears after advancing fake time, and can be skipped without losing the underlying Orb.
- Web: ensure the new component mounts only for the application route and the app root remains mounted during splash; run `npm --workspace apps/web run typecheck` and `npm --workspace apps/web run build`.
- Native: run `flutter pub get`, `flutter analyze`, `flutter test` inside `apps/flutter_app`.
- CI must pass for the PR's **final commit**, not just for older commits.

## Manual QA before production merge

- Mobile Safari/iOS, Android Chrome, desktop sizes (320–1440px): no crop of wordmark, capsule, or trademark.
- Web PWA start screen: no initial flash of app before the splash; splash always dismisses, including after a navigation/reload.
- Test reduced-motion settings and keyboard/VoiceOver/TalkBack skip access.
- Confirm no unnecessary navigation replay: switch study scenes while Orb is running without showing splash again.
- Review Vercel branch preview for the Web. Flutter installation requires generating and distributing a new iOS/Android build; GitHub merge alone does not update installed native apps.

## Status

Implemented on feature branch for review. Not represented as deployed to production or installed into the user's App Store/Play Store build until distribution and device checks are complete.
