#!/usr/bin/env node
/**
 * Static Apple HIG checks for the current iOS implementation. Never mistake
 * static checks for a TestFlight or App Review certification.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = path => readFileSync(resolve(root, path), "utf8");
const main = read("apps/flutter_app/lib/main.dart");
const paywall = read("apps/flutter_app/lib/native_hard_paywall.dart");
const orbital = read("apps/flutter_app/lib/orbital_home.dart");
const test = read("apps/flutter_app/test/widget_test.dart");
const pubspec = read("apps/flutter_app/pubspec.yaml");
const checks = [
  ["Default native gate cannot bypass payment", !main.includes("_nativePaywallEnabled") &&
    main.includes("child: const NativeHardPaywall()")],
  ["Startup does not expose StudyHome without entitlement", !main.includes("defaultValue: false") &&
    !main.includes("? const NativeHardPaywall()")],
  ["Application reacts to system appearance", main.includes("themeMode: ThemeMode.system") &&
    main.includes("darkTheme: ThemeData(")],
  ["Native subscription gate uses theme semantics", paywall.includes("Theme.of(context).colorScheme") &&
    paywall.includes("SingleChildScrollView")],
  ["Secondary tools remain available but grouped", orbital.includes("ExpansionTile(") &&
    orbital.includes("modes.skip(4)")],
  ["Widget tests cover unauthorized entry and large text", test.includes("native purchase gate is fail-closed") &&
    test.includes("text on compact iPhone")],
  ["No unbundled Inter declared as the app-wide font", !main.includes("fontFamily: 'Inter'")],
  ["Brand font remains bundled", pubspec.includes("family: LeagueSpartan")],
];
const failures = checks.filter(([, pass]) => !pass);
checks.forEach(([name, pass]) => console.log(`${pass ? "PASS" : "FAIL"}: ${name}`));
const iosProject = existsSync(resolve(root, "apps/flutter_app/ios/Runner/Info.plist"));
console.log(iosProject
  ? "INFO: iOS Runner/Info.plist exists; archive still requires macOS/Xcode."
  : "BLOCKED: conventional iOS Runner/Info.plist missing; Xcode archive unverified.");
console.log("BLOCKED: IAP product catalog, verified transactions, authenticated account binding, and restore lifecycle not certified.");
console.log("BLOCKED: VoiceOver, iOS Dynamic Type, screenshots, privacy manifest, native dark color audit, and TestFlight pending.");
if (failures.length) process.exitCode = 1;
