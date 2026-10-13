import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const source = (path) => readFileSync(new URL(path, root), "utf8");
const web = source("apps/web/src/SoftwareApp.tsx");
const webTranslations = source("apps/web/src/i18n.ts");
const landing = source("apps/web/src/App.tsx");
const flutter = source("apps/flutter_app/lib/main.dart");
const flutterTranslations = source("apps/flutter_app/lib/i18n.dart");
const flutterTest = source("apps/flutter_app/test/widget_test.dart");

function includesEvery(label, body, patterns) {
  for (const pattern of patterns) {
    assert.ok(body.includes(pattern), label + " is missing " + pattern);
  }
}

// English + Brazilian Portuguese share the exact study-first promise.
includesEvery("Web offer languages", webTranslations, [
  'homeTitle: "Turn explanations into practice."',
  'homeTitle: "Transforme explicações em prática."',
  'firstAnswerEvidence:',
  'questionGroundingNote:',
  'continuityNotice:',
  'practiceAgain:',
  'generateMaterial: "Create and start practicing"',
  'generateMaterial: "Criar e começar a praticar"',
]);
includesEvery("Native offer languages", flutterTranslations, [
  "'learnAnything': 'Understand.\\nPractice.'",
  "'learnAnything': 'Entenda.\\nPratique.'",
  "'continuityNote':",
  "'firstAnswerEvidence':",
  "'summaryReview':",
  "'testAnswerCount':",
]);
includesEvery("Real content-first Web flow", web, [
  'await importStudyMaterial({',
  'await startMode("learn", item)',
  'await submitStudyAnswer({',
  'name: "first_answer_submitted"',
  'if (!firstAnswerSubmitted)',
  'setFirstAnswerSubmitted(true)',
  'session.mode !== "test"',
  't("software.questionGroundingNote")',
  't("software.continuityNotice")',
  't("software.practiceAgain")',
]);
includesEvery("Native behavior and review", flutter, [
  'await _api.prepare(',
  'await _api.answer(',
  '_firstAnswerSubmitted = true',
  "isFirstAnswer && _mode != 'test'",
  "context.tr('continuityNote')",
  "context.tr('summaryReview')",
  "'weakConcepts'",
]);
includesEvery("Native widget regressions", flutterTest, [
  'Understand.\\nPractice.',
  'Entenda.\\nPratique.',
  'Começar a praticar',
]);
includesEvery("Web landing honesty", landing, [
  't("landing.uniqueOfferBody")',
  't("landing.aiConnectionNotice")',
]);
assert.ok(!web.includes('t("software.syncedEverywhere")'),
  "Never make an unverified live cross-platform sync claim");
console.log("InstantStudy unique-offer app consistency checks passed (static gates).");
