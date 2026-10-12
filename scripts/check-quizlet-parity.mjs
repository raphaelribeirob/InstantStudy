#!/usr/bin/env node
/**
 * Static release evidence gate. CI PASS means the inventory is structurally valid,
 * NOT that the Quizlet offer is delivered or that the Hardwall is live.
 * Set INSTANTSTUDY_CERTIFY_100=1 only for a deliberate release certification.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(root, "docs/quizlet-parity.manifest.json"), "utf8"));
const fail = (message) => { console.error("PARITY GATE ERROR:", message); process.exitCode = 1; };
const uniq = (values) => new Set(values).size === values.length;
const allowedStatuses = new Set(["implemented_unverified", "partial", "blocked", "missing", "verified"]);
const statuses = {};
const requirements = manifest.requirements || [];
const languages = manifest.languageScope?.offerLanguages || [];
const locales = languages.flatMap((l) => l.locales || []);

if (manifest.policy?.monetization !== "hard_paywall_only" || manifest.policy.freeLearning !== false)
  fail("Hard Paywall only and no freemium are mandatory");
if (manifest.policy?.database !== "neon_postgresql") fail("Neon PostgreSQL is the only primary DB");
if (manifest.policy?.productionReleaseAllowed !== false && manifest.policy?.certification !== "CERTIFIED")
  fail("Production release cannot be marked approved without certification");
if (languages.length !== 17 || locales.length !== 19 || !uniq(locales))
  fail("Quizlet language scope must have 17 offer languages and 19 unique regional locales");
if (!uniq(languages.map((l) => l.key))) fail("Duplicate offer language");
if (!uniq(requirements.map((r) => r.id)) || requirements.length < 40)
  fail("Duplicate IDs or missing functional offer inventory");
for (const row of requirements) {
  if (!/^[A-Z]+-[0-9]{2}$/.test(row.id || "") || !row.title ||
      !["P0","P1","P2"].includes(row.priority) || !allowedStatuses.has(row.status) ||
      !row.acceptance || !Array.isArray(row.platforms) || row.platforms.length === 0)
    fail("Malformed acceptance record: " + JSON.stringify(row.id));
  if (!row.sourceUrl?.startsWith("https://")) fail("Missing official offer source for " + row.id);
  if (row.status === "verified" && (!Array.isArray(row.verifiedEvidence) || !row.verifiedEvidence.length))
    fail(row.id + " marked verified without reviewable evidence");
  statuses[row.status] = (statuses[row.status] || 0) + 1;
}
for (const lang of languages) {
  if (!lang.name || !lang.key || !lang.locales?.length) fail("Incomplete language record");
  if (lang.uiStatus === "verified" && !lang.qaEvidence?.length)
    fail("Locale marked verified without QA evidence: " + lang.key);
}
const webI18n = readFileSync(resolve(root, "apps/web/src/i18n.ts"), "utf8");
const flutterI18n = readFileSync(resolve(root, "apps/flutter_app/lib/i18n.dart"), "utf8");
if (!webI18n.includes("supportedLanguages") || !flutterI18n.includes("supportedInstantStudyLocales"))
  fail("Web/Flutter localization declarations not found");
const hardwallBff = readFileSync(resolve(root,"apps/web/api/_hardPaywall.js"),"utf8");
const hardwallApi = readFileSync(resolve(root,"apps/mcp-server/src/hardPaywallSignature.ts"),"utf8");
if (!hardwallBff.includes("resolveHardPaywallAccess") || !hardwallApi.includes("isSignedBffRequest"))
  fail("Paid access guards missing from Web or backend");
const incomplete = requirements.filter((r) => r.status !== "verified");
const unverifiedLanguages = languages.filter((l) =>
  l.uiStatus !== "verified" || l.pedagogyStatus !== "verified" ||
  (l.qaEvidence?.length || 0) === 0);
const report = {
  benchmarkDate: manifest.baselineDate,
  certification: manifest.policy.certification,
  offerRequirements: requirements.length,
  statuses,
  offerLanguages: languages.length,
  regionalLocales: locales.length,
  unverifiedRequirements: incomplete.length,
  unverifiedLanguageGroups: unverifiedLanguages.length,
  releaseBlocked: incomplete.length > 0 || unverifiedLanguages.length > 0 ||
    manifest.policy.productionReleaseAllowed !== true,
};
console.log("InstantStudy Quizlet parity inventory (NOT a live E2E test):");
console.log(JSON.stringify(report, null, 2));
if (process.env.INSTANTSTUDY_CERTIFY_100 === "1" && report.releaseBlocked)
  fail("100% release certification REFUSED: unresolved functional, locale, or production gates");
if (process.exitCode) process.exit(process.exitCode);
