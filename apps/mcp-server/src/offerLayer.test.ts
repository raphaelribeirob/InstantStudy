import assert from "node:assert/strict";
import test from "node:test";
import { buildAudioStudy, buildRetentionInsights } from "./offerLayer.js";
import type { AdaptiveStudySession } from "./studyEngine.js";

function session(overrides: Partial<AdaptiveStudySession> = {}): AdaptiveStudySession {
  return {
    id: crypto.randomUUID(),
    contentSessionId: crypto.randomUUID(),
    learnerId: "learner-a",
    title: "Biology",
    mode: "learn",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: "completed",
    questionIndex: 2,
    maxQuestions: 2,
    concepts: [
      {
        id: crypto.randomUUID(),
        label: "Photosynthesis",
        sourceExcerpt: "Photosynthesis converts light energy into chemical energy.",
        mastery: 0.84,
        attempts: 2,
        correct: 2,
        partial: 0,
        incorrect: 0,
        difficulty: 2,
        lastSeenAt: new Date().toISOString(),
        lastPerformance: 0.9,
        stabilityDays: 3,
        nextReviewAt: new Date(Date.now() + 86_400_000).toISOString(),
        missingConcepts: [],
      },
    ],
    attempts: [
      {
        id: crypto.randomUUID(),
        conceptId: "c1",
        questionIndex: 1,
        createdAt: new Date().toISOString(),
        correctness: 0.9,
        completeness: 0.8,
        confidence: 0.9,
        missingConcepts: [],
      },
      {
        id: crypto.randomUUID(),
        conceptId: "c1",
        questionIndex: 2,
        createdAt: new Date().toISOString(),
        correctness: 1,
        completeness: 1,
        confidence: 0.95,
        missingConcepts: [],
      },
    ],
    ...overrides,
  };
}

test("retention insights are derived from actual study state", () => {
  const insights = buildRetentionInsights([session()]);
  assert.equal(insights.sessions, 1);
  assert.equal(insights.completedSessions, 1);
  assert.equal(insights.attempts, 2);
  assert.equal(insights.averageMastery, 0.84);
  assert.equal(insights.retentionScore, 1);
  assert.equal(insights.strongConcepts[0]?.label, "Photosynthesis");
  assert.equal(insights.charms.find((item) => item.id === "first-session")?.unlocked, true);
});

test("audio study contains recall pauses and material grounding", () => {
  const audio = buildAudioStudy("Biology", {
    summary: "Photosynthesis stores light energy as chemical energy.",
    outline: [
      "Chlorophyll absorbs light.",
      "The Calvin cycle fixes carbon dioxide.",
    ],
    keyConcepts: ["Chlorophyll", "Calvin cycle"],
    flashcards: [],
    generatedBy: "deterministic",
  });

  assert.match(audio.segments[0]?.text ?? "", /Biology/);
  assert.ok(audio.segments.some((segment) => segment.speaker === "Learner"));
  assert.ok(audio.segments.some((segment) => /Chlorophyll/.test(segment.text)));
  assert.ok(audio.estimatedMinutes >= 1);
});
