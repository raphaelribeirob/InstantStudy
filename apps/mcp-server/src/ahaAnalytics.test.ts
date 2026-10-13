import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { firstAhaEvidence, captureVerifiedActivation } from "./ahaAnalytics.js";
import type { StudyAttempt } from "./studyEngine.js";

function attempt(conceptId: string, score: number, confidence = 0.93): StudyAttempt {
  return { id: randomUUID(), conceptId, questionIndex: 1,
    createdAt: new Date().toISOString(), correctness: score,
    completeness: score, confidence, missingConcepts: [] };
}

test("AHA requires a confidently graded improvement on the same concept", () => {
  const now = new Date("2026-10-12T20:05:00.000Z");
  const started = "2026-10-12T20:00:00.000Z";
  const a = attempt("cell", 0.25);
  const b = attempt("cell", 0.91);
  const evidence = firstAhaEvidence([a, b], "learn", started, now);
  assert.equal(evidence?.variant, "recovery");
  assert.equal(evidence?.scoreBefore, 0.25);
  assert.equal(evidence?.scoreAfter, 0.91);
  assert.equal(evidence?.elapsedSeconds, 300);
  assert.equal(firstAhaEvidence([a,b], "test", started, now), null);
  assert.equal(firstAhaEvidence([a, attempt("cell", .91,.3)], "learn", started, now), null);
  assert.equal(firstAhaEvidence([a, attempt("other", .91)], "learn", started, now), null);
  assert.equal(firstAhaEvidence([a], "learn", started, now), null);
  assert.equal(firstAhaEvidence([a,b,attempt("cell",.95)], "learn", started, now), null);
});

test("Correct first answer alone does not count; two distinct confident concepts can", () => {
  const one = attempt("a", .9), two = attempt("b", .9);
  assert.equal(firstAhaEvidence([one], "learn", new Date().toISOString()), null);
  assert.equal(firstAhaEvidence([one,two], "learn", new Date().toISOString())?.variant,
    "demonstrated_mastery");
  assert.equal(firstAhaEvidence([one,attempt("a", .95)], "learn",
    new Date().toISOString()), null);
  assert.equal(firstAhaEvidence([one,attempt("b", .95, .3)], "learn",
    new Date().toISOString()), null);
});

test("Missing telemetry settings must not emit events or block learning", async () => {
  const original=process.env.INSTANTSTUDY_POSTHOG_PROJECT_KEY;
  delete process.env.INSTANTSTUDY_POSTHOG_PROJECT_KEY;
  try { await captureVerifiedActivation("learner-123","learning_aha_achieved",{}); }
  finally {
    if (original !== undefined) process.env.INSTANTSTUDY_POSTHOG_PROJECT_KEY = original;
  }
});
