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

test("cannot finish an unanswered or partially answered exam, nor grade an unpresented concept", async () => {
  const content = new ContentSessionStore().create({
    title: "Biology", mode: "test",
    contentText: "Photosynthesis uses light. Chloroplasts contain chlorophyll.",
  });
  const engine = new StudyEngine();
  const session = await engine.start(content, {
    learnerId: "exam-learner",
    mode: "test", maxQuestions: 3,
    materialId: "81e63e6b-a05f-4ae7-8789-823d66cf84ab",
    concepts: [
      { label: "Photosynthesis", sourceExcerpt: "Photosynthesis uses light." },
      { label: "Chlorophyll", sourceExcerpt: "Chloroplasts contain chlorophyll." },
    ],
  });
  await assert.rejects(() => engine.finish(session.id), /study_session_incomplete/);
  const first = await engine.next(session.id);
  if (first.done) throw new Error("expected question");
  const wrong = session.concepts.find(c => c.id !== first.concept.id)!;
  await assert.rejects(() => engine.submit(session.id, wrong.id, {
    correctness: 1, completeness: 1, userAnswer: "forged score",
  }), /not for the active question/);
  const answered = await engine.submit(session.id, first.concept.id, {
    correctness: 1, completeness: 1, userAnswer: "Light energy",
  });
  assert.equal(answered.done, false);
  assert.equal((await engine.get(session.id))?.attempts.length, 1);
  await assert.rejects(() => engine.finish(session.id), /study_session_incomplete/);
  assert.equal((await engine.get(session.id))?.status, "active");
});

test("a legitimately expired timed test is marked complete but unanswered questions score zero", async () => {
  const content = new ContentSessionStore().create({
    title: "History", mode: "test", contentText: "Rome was founded in antiquity.",
  });
  const engine = new StudyEngine();
  const session = await engine.start(content, {
    learnerId: "timed-learner", mode: "test", maxQuestions: 4,
    testDurationMinutes: 5,
    concepts: [{ label: "Rome", sourceExcerpt: "Rome was founded in antiquity." }],
  });
  const next = await engine.next(session.id);
  if (next.done) throw new Error("expected first question");
  await engine.submit(session.id, next.concept.id, {
    correctness: 1, completeness: 1, userAnswer: "Rome",
  });
  if (!session.testConfig) throw new Error("timed test missing config");
  session.testConfig.endsAt = new Date(Date.now() - 1000).toISOString();
  const summary = await engine.finish(session.id);
  assert.equal(summary.completed, true);
  assert.equal(summary.completionReason, "time_expired");
  assert.equal(summary.testResult?.answered, 1);
  assert.equal(summary.testResult?.totalQuestions, 4);
  assert.equal(summary.testResult?.scorePercent, 25);
  assert.equal((await engine.get(session.id))?.completionReason, "time_expired");
});

test("a completed test must have all actual answers and retains material provenance", async () => {
  const content = new ContentSessionStore().create({
    title: "Physics", mode: "test", contentText: "Velocity is displacement per time.",
  });
  const engine = new StudyEngine();
  const sourceId = "81e63e6b-a05f-4ae7-8789-823d66cf84ab";
  const session = await engine.start(content, {
    learnerId: "source-learner", materialId: sourceId, mode: "test", maxQuestions: 2,
    concepts: [{ label: "Velocity", sourceExcerpt: "Velocity is displacement per time." }],
  });
  for (let i = 0; i < 2; i++) {
    const next = await engine.next(session.id);
    if (next.done) throw new Error("expected answerable question");
    await engine.submit(session.id, next.concept.id, {
      correctness: 0.8, completeness: 0.8, userAnswer: "displacement over time",
    });
  }
  const stored = await engine.get(session.id);
  assert.equal(stored?.status, "completed");
  assert.equal(stored?.completionReason, "all_questions");
  assert.equal(stored?.materialId, sourceId);
  assert.equal((await engine.finish(session.id)).testResult?.answered, 2);
});

test("Practice Test question payload never exposes its canonical source excerpt", async () => {
  const text = "The mitochondrion generates ATP through cellular respiration.";
  const source = new ContentSessionStore().create({
    title: "Cell biology", mode: "test", contentText: text,
  });
  const engine = new StudyEngine();
  const session = await engine.start(source, {
    mode: "test", maxQuestions: 1, testQuestionTypes: ["free_recall"],
    concepts: [{
      label: "Mitochondrion",
      sourceExcerpt: text,
      studyPrompt: "Explain the main role of mitochondria.",
    }],
  });
  const next = await engine.next(session.id);
  if (next.done) throw new Error("Expected a test question");
  assert.equal("sourceExcerpt" in next.concept, false);
  assert.doesNotMatch(JSON.stringify(next.concept), /generates ATP/);
  assert.equal(next.question.prompt, "Explain the main role of mitochondria.");
  const serverState = await engine.get(session.id);
  assert.equal(serverState?.concepts[0]?.sourceExcerpt, text);
});
