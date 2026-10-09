import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { buildAudioStudy, buildRetentionInsights, buildStudyGame } from "./offerLayer.js";
import type { AdaptiveStudySession } from "./studyEngine.js";

function session(overrides: Partial<AdaptiveStudySession> = {}): AdaptiveStudySession {
  return {
    id: randomUUID(),
    contentSessionId: randomUUID(),
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
        id: randomUUID(),
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
        id: randomUUID(),
        conceptId: "c1",
        questionIndex: 1,
        createdAt: new Date().toISOString(),
        correctness: 0.9,
        completeness: 0.8,
        confidence: 0.9,
        missingConcepts: [],
      },
      {
        id: randomUUID(),
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
  assert.equal(insights.retentionScore, null);
  assert.equal(insights.delayedReviewAttempts, 0);
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
  assert.ok(audio.segments.some((segment) => segment.speaker === "Coach"));
  assert.ok(audio.segments.some((segment) => /Chlorophyll/.test(segment.text)));
  assert.ok(audio.estimatedMinutes >= 1);
});


test("study game is deterministic and grounded in flashcards", () => {
  const assets = {
    summary: "Cells use ATP.",
    outline: ["ATP stores chemical energy."],
    keyConcepts: ["ATP"],
    flashcards: [
      { id: "a", concept: "ATP", front: "What stores usable cellular energy?", back: "ATP stores usable cellular energy." },
      { id: "b", concept: "Mitochondria", front: "Where is most ATP made?", back: "Most ATP is made in mitochondria." },
    ],
    generatedBy: "deterministic" as const,
  };

  const first = buildStudyGame("Biology", assets);
  const second = buildStudyGame("Biology", assets);
  assert.deepEqual(first, second);
  assert.equal(first.pairCount, 2);
  assert.equal(first.cards.length, 4);
  assert.ok(first.cards.every((card) => card.text.includes("ATP") || card.text.includes("mitochondria") || card.text.includes("energy")));
});

test("audio study is a two-speaker conversational podcast", () => {
  const audio = buildAudioStudy("Biology", {
    summary: "Photosynthesis stores light energy.",
    outline: ["Chlorophyll absorbs light."],
    keyConcepts: ["Chlorophyll"],
    flashcards: [],
    generatedBy: "deterministic",
  });

  assert.ok(audio.segments.some((segment) => segment.speaker === "Host"));
  assert.ok(audio.segments.some((segment) => segment.speaker === "Coach"));
  assert.ok(audio.segments.some((segment) => /challenge/i.test(segment.text)));
});

test("retention needs actual later-day recall attempts", () => {
  const first = session({
    id: randomUUID(),
    createdAt: "2026-10-01T10:00:00.000Z",
    attempts: [{
      id: randomUUID(), conceptId: "c1", questionIndex: 1,
      createdAt: "2026-10-01T10:05:00.000Z",
      correctness: 1, completeness: 1, confidence: 1, missingConcepts: [],
    }],
    concepts: [{
      id: "c1", label: "Photosynthesis",
      sourceExcerpt: "Photosynthesis converts energy.",
      mastery: .8, attempts: 1, correct: 1, partial: 0, incorrect: 0,
      difficulty: 2, missingConcepts: [],
    }],
  });
  const retest = session({
    id: randomUUID(),
    createdAt: "2026-10-04T10:00:00.000Z",
    attempts: [{
      id: randomUUID(), conceptId: "c2", questionIndex: 1,
      createdAt: "2026-10-04T10:05:00.000Z",
      correctness: 1, completeness: .9, confidence: 1, missingConcepts: [],
    }],
    concepts: [{
      id: "c2", label: "Photosynthesis",
      sourceExcerpt: "Photosynthesis converts energy.",
      mastery: .9, attempts: 1, correct: 1, partial: 0, incorrect: 0,
      difficulty: 2, missingConcepts: [],
    }],
  });
  const insights = buildRetentionInsights([retest, first]);
  assert.equal(insights.delayedReviewAttempts, 1);
  assert.equal(insights.retentionScore, 1);
});

test("podcast language follows Portuguese learning material", () => {
  const audio = buildAudioStudy("Fotossíntese", {
    summary: "A fotossíntese transforma energia luminosa em energia química.",
    outline: ["O processo acontece nas células e depende da luz."],
    keyConcepts: ["Fotossíntese", "Energia"], flashcards: [], generatedBy: "deterministic",
  });
  assert.match(audio.segments[0].text, /Bem-vindo/);
  assert.match(audio.segments[2].text, /Ideia principal/);
});
