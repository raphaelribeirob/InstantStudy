import assert from "node:assert/strict";
import test from "node:test";
import { ContentSessionStore } from "./contentSessions.js";
import { StudyEngine } from "./studyEngine.js";

test("StudyEngine updates mastery, difficulty and review schedule deterministically", async () => {
  const store = new ContentSessionStore();
  const content = store.create({
    title: "Biology",
    mode: "learn",
    contentText:
      "Photosynthesis converts light energy into chemical energy in chloroplasts.",
  });

  const engine = new StudyEngine();
  const session = await engine.start(content, {
    learnerId: "learner-test",
    maxQuestions: 2,
    concepts: [
      {
        label: "Photosynthesis",
        sourceExcerpt:
          "Photosynthesis converts light energy into chemical energy in chloroplasts.",
      },
    ],
  });

  const next = await engine.next(session.id);
  assert.equal(next.done, false);
  if (next.done) throw new Error("expected an active question");

  const result = await engine.submit(session.id, next.concept.id, {
    correctness: 0.95,
    completeness: 0.95,
    confidence: 0.95,
    missingConcepts: [],
    userAnswer: "Light energy becomes chemical energy in chloroplasts.",
  });

  assert.ok((result.concept.mastery ?? 0) > 0.15);
  assert.equal(result.concept.difficulty, 2);
  assert.ok(result.concept.nextReviewAt);
  assert.equal(result.nextPolicy, "continue");
  assert.equal(result.activationEvent, "first_answer_submitted");
});

test("Test mode records answers without immediate correctness feedback", async () => {
  const store = new ContentSessionStore();
  const content = store.create({
    title: "History",
    mode: "test",
    contentText:
      "The Treaty of Versailles was signed after World War I and imposed terms on Germany.",
  });

  const engine = new StudyEngine();
  const session = await engine.start(content, {
    maxQuestions: 2,
    concepts: [
      {
        label: "Treaty of Versailles",
        sourceExcerpt:
          "The Treaty of Versailles was signed after World War I and imposed terms on Germany.",
      },
    ],
  });

  const next = await engine.next(session.id);
  assert.equal(next.done, false);
  if (next.done) throw new Error("expected an active test question");

  const result = await engine.submit(session.id, next.concept.id, {
    correctness: 0.8,
    completeness: 0.8,
    confidence: 0.9,
    missingConcepts: [],
  });

  assert.deepEqual(result.evaluation, {
    recorded: true,
    suppressImmediateFeedback: true,
  });
});
