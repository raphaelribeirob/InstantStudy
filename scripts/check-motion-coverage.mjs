#!/usr/bin/env node
/** Static wiring gate, not a screenshot or real-device animation certification. */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = (p) => readFileSync(resolve(root, p), "utf8");
const assertions = [
  ["provider", "apps/web/src/main.tsx", ["<StudyMotionProvider>", 'import "./study-motion.css"']],
  ["workspace", "apps/web/src/SoftwareApp.tsx", ["<StudyViewTransition view={view}>", "motion.article", "motion.h2", "motion.button"]],
  ["paywall", "apps/web/src/HardPaywallGate.tsx", ["<StudyMotionPanel id={stage}>"]],
  ["marketing", "apps/web/src/App.tsx", ["<StudyReveal", "motion.div className=\"future-title\""]],
  ["accessibility", "apps/web/src/StudyMotion.tsx", ['reducedMotion="user"', "useReducedMotion", "studyExit(reduced)"]],
  ["css reduced motion", "apps/web/src/study-motion.css", ["prefers-reduced-motion:reduce", "animation:none!important"]],
  ["native theme", "apps/flutter_app/lib/main.dart", ["StudyMotion.duration", "StudyPageTransitionsBuilder"]],
  ["native accessibility", "apps/flutter_app/lib/study_motion.dart", ["disableAnimations", "Duration.zero"]],
];
let failures = 0;
for (const [area, path, needles] of assertions) {
  const text = source(path);
  for (const term of needles) {
    if (!text.includes(term)) {
      console.error(`MOTION COVERAGE FAIL [${area}]: missing ${JSON.stringify(term)} in ${path}`);
      failures++;
    }
  }
}
if (failures) process.exit(1);
console.log("InstantStudy Motion: Web, Flutter, paid gate and reduced-motion wiring present.");
console.log("Still requires real visual regression, a11y, device and performance acceptance.");
