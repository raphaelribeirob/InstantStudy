# Apple HIG — implementation ledger

**InstantStudy™ • 2026-10-12 • PR #53**  
Status: **PARTIALLY IMPLEMENTED / NOT APP STORE READY**.  
Source: [APPLE_DESIGN.md](APPLE_DESIGN.md) (audit snapshot); dependent PRs [#49](https://github.com/raphaelribeirob/InstantStudy/pull/49), [#50](https://github.com/raphaelribeirob/InstantStudy/pull/50), [#51](https://github.com/raphaelribeirob/InstantStudy/pull/51), [#52](https://github.com/raphaelribeirob/InstantStudy/pull/52).

## Changes landed in this remediation branch

| Finding | Change | Evidence | Current verdict |
|---|---|---|---|
| APPLE-P0-02 (native gate bypass) | Removed default-false feature gate from Flutter. Startup mounts `NativeHardPaywall` unconditionally; not `StudyHome`. | `apps/flutter_app/lib/main.dart` and widget test | **Code corrected**, backend/payment E2E still pending |
| APPLE-P0-03 (subscription disclosure) | Replaced hard-coded developer-looking paywall with readable, localized, scrollable and semantically labelled notice; no pretend price or charge. | `apps/flutter_app/lib/native_hard_paywall.dart` | **Partial**; genuine products/terms/restore are blocked |
| APPLE-P1-01 (small type) | Increased overly small Flutter labels, including mode controls and orbital descriptions; removed app-wide undeclared Inter family. Brand uses bundled League Spartan. | `main.dart`, `orbital_home.dart`, `pubspec.yaml` | **Partial**; type ramp and device QA not complete |
| APPLE-P1-02 (Dynamic Type) | Native mode selector uses adaptive horizontal scroll at enlarged text; cards have dynamic height; paywall scrolls. | Flutter 200% test cases | **Partial**; entire app 200% E2E still required |
| APPLE-P1-03 (touch targets) | Mode rail min hit height increased to 48 logical pixels; main CTA remains 52. | Widget tree | **Partial**; full target audit pending |
| APPLE-P1-04 (navigation overload) | Only 4 primary modes shown initially; remaining 8 accessible behind labelled expansion. | `orbital_home.dart`, expansion test | **Partial**; user research and navigation state audit pending |
| APPLE-P1-05 (appearance) | Added semantic dark theme and `ThemeMode.system`; subscription notice uses `ColorScheme` colors. | `main.dart`, `native_hard_paywall.dart` | **Partial**; StudyHome still includes fixed light colors |
| APPLE-P1-07 (VoiceOver semantics) | Added header semantics to paywall; button/selection semantics to orbital tiles and mode rail. | Widgets | **Partial**; real VoiceOver focus/rotor test pending |
| APPLE-P1-09 (motion) | Mode rail respects `MediaQuery.disableAnimations`; PR #50 remains separate. | `main.dart` | **Partial**; full motion token integration pending |
| APPLE-P1 static gate | `npm run audit:apple-hig` checks critical wiring on every CI run. | `scripts/audit-apple-hig.mjs` / CI | **Static checks only** |

## Unresolved P0 conditions — do not distribute as a paid app yet

1. **APP STORE PRODUCTS:** Register renewable subscription products in App Store Connect; Apple product metadata and regional terms must be correct.
2. **REAL STOREKIT:** Integrate `in_app_purchase`/StoreKit 2, callbacks, restore, purchase pending/error/renewal/refund and Apple's subscription lifecycle. No checkout is enabled in this branch.
3. **NATIVE AUTH:** Link the app to an actual authenticated learner, never the local `flutter-* ` identifier. The current Flutter client uses an anonymous pseudonymous ID for study and is intentionally blocked by the fail-closed gate.
4. **SERVER RECEIPT / TRANSACTION VALIDATION:** Verify App Store signed transactions or server status with Apple's supported libraries/endpoints, bind them to the same learner, reject replay/cross-account reuse, revalidate on app foreground and revoke access after expiration/refund. Nothing in this branch grants native entitlements.
5. **RESTORE:** Restore from StoreKit, validate on server before unlocking, handle account switching and reinstall.
6. **XCODE / APP ICON:** Confirm or generate complete iOS Flutter Runner project, `Info.plist`, bundle identifier, signing, 1024px icon asset catalog, launch screen and privacy manifest; GitHub paths were not found in the audited branch.
7. **LEGAL / ACCESS:** Verify privacy disclosure, account deletion if applicable, social login requirements if applicable, full paywall disclosures and Apple App Review rules in each sale region.
8. **TESTFLIGHT:** Device/simulator StoreKit sandbox, screenshot regression, VoiceOver, contrast and launch testing.

**No mock subscription, env flag or local receipt is an acceptable substitute for verified access.**

## Remaining Apple HIG acceptance tests

- `IOS-DES-01..15` from [APPLE_DESIGN.md](APPLE_DESIGN.md) stay **UNVERIFIED** until independent device/Xcode tests have links to logs, screenshots and release SHA.
- Existing unit/widget tests assert implementation contracts. They do **not** establish App Store approval, HIG compliance at 100%, or actual paid functionality.
- UI dark mode needs an audit of all fixed-color `StudyHome` widgets before it is marketed as complete.
- The native StoreKit checkout is intentionally not offered until users can obtain verified entitlement. Shipping the current locked client would provide no paid learning flow.

## GitHub-only validation

```sh
npm run audit:apple-hig   # statically checks core safety and accessibility wiring
npm run typecheck
npm test
npm run build
cd apps/flutter_app && flutter analyze && flutter test
```

Use commit SHA, device, iOS version, text size, screen reader settings and expected/actual values for each independent test. Avoid leaking receipts, student material or session tokens into CI logs.

**Release decision: BLOCKED.** Merge code only after CI; publish only after Apple P0 tests are actually implemented and accepted. Changes to Vercel, Neon, App Store Connect and production are outside this PR.
