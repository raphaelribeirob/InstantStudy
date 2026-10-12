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
  const stored = await engine.get(session.id);
  const card = stored?.concepts[0]?.fsrsCard;
  assert.ok(card, "FSRS card should persist after a graded attempt");
  assert.equal(card.due, result.concept.nextReviewAt);
  assert.ok(Number.isFinite(card.stability));
  const nextSession = await engine.start(content, {
    learnerId: "learner-test",
    maxQuestions: 1,
    concepts: [{
      label: "Photosynthesis",
      sourceExcerpt: "Photosynthesis converts light energy into chemical energy in chloroplasts.",
    }],
  });
  assert.equal(nextSession.concepts[0]?.fsrsCard?.due, card.due);
  assert.equal(nextSession.concepts[0]?.nextReviewAt, result.concept.nextReviewAt);
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

test("source-grounded flashcard prompt is presented in Quiz instead of generic text", async () => {
  const store = new ContentSessionStore();
  const content = store.create({
    title: "Fotossíntese",
    mode: "quiz",
    contentText: "A fotossíntese converte energia luminosa em energia química nos cloroplastos.",
  });
  const engine = new StudyEngine();
  const prompt = "Qual energia a fotossíntese transforma e onde?";
  const session = await engine.start(content, {
    mode: "quiz",
    maxQuestions: 1,
    concepts: [{
      label: "Fotossíntese",
      sourceExcerpt: "A fotossíntese converte energia luminosa em energia química nos cloroplastos.",
      studyPrompt: prompt,
    }],
  });
  const next = await engine.next(session.id);
  assert.equal(next.done, false);
  if (next.done) throw new Error("expected active quiz");
  assert.equal(next.question.prompt, prompt);
});

test("a real final answer persists completed status and completion time for agent plan proof", async () => {
  const source = new ContentSessionStore().create({
    title: "Biology", mode: "test",
    contentText: "Chloroplasts convert light energy into chemical energy.",
  });
  const engine = new StudyEngine();
  const session = await engine.start(source, {
    learnerId: "verified-learner", mode: "test", maxQuestions: 1,
    concepts: [{ label: "Chloroplasts", sourceExcerpt:
      "Chloroplasts convert light energy into chemical energy." }],
  });
  const next = await engine.next(session.id);
  if (next.done) throw new Error("expected a question");
  const result = await engine.submit(session.id, next.concept.id, {
    correctness: 0.7, completeness: 0.7, userAnswer: "Energy changes form",
  });
  assert.equal(result.done, true);
  const stored = await engine.get(session.id);
  assert.equal(stored?.status, "completed");
  assert.ok(stored?.completedAt);
  assert.equal(stored?.learnerId, "verified-learner");
  await assert.rejects(
    () => engine.submit(session.id, next.concept.id, {
      correctness: 1, completeness: 1, userAnswer: "duplicate",
    }),
    /completed/,
  );
});
