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

test("practice test covers all concepts before repeating one", async () => {
  const content = new ContentSessionStore().create({
    title:"History of science", mode:"test",
    contentText:"Physics explores motion. Chemistry studies matter. Biology examines life.",
  });
  const engine = new StudyEngine();
  const session = await engine.start(content, {
    mode:"test", maxQuestions:6, testQuestionTypes:["short_answer"],
    concepts:[
      {label:"Physics",sourceExcerpt:"Physics explores motion and the laws governing forces."},
      {label:"Chemistry",sourceExcerpt:"Chemistry studies matter, bonds, and chemical reactions."},
      {label:"Biology",sourceExcerpt:"Biology examines living organisms and cellular processes."},
    ],
  });
  const seen: string[] = [];
  for (let i=0;i<6;i++) {
    const current = await engine.next(session.id);
    if (current.done) throw new Error("Expected all planned questions");
    seen.push(current.concept.id);
    const result = await engine.submit(session.id,current.concept.id,{
      correctness:0.98,completeness:0.95,userAnswer:"Evidence-based answer",
    });
    assert.equal(result.done,i===5);
  }
  assert.equal(new Set(seen.slice(0,3)).size,3,"All topics must appear before a repeat");
  assert.equal(new Set(seen.slice(3,6)).size,3,"Balanced second pass across topics");
  const counts = new Map(seen.map(id=>[id,seen.filter(value=>value===id).length]));
  assert.deepEqual([...counts.values()].sort(),[2,2,2]);
});

test("first Learn mistake receives same-concept written retest and a graded AHA", async () => {
  const source = new ContentSessionStore().create({
    title: "Cells", mode: "learn",
    contentText: "Chloroplasts convert light into chemical energy. Mitochondria make ATP.",
  });
  const engine = new StudyEngine();
  const session = await engine.start(source, {
    learnerId: "test-aha-learner", mode: "learn", maxQuestions: 3,
    concepts: [
      { label: "Chloroplasts", sourceExcerpt: "Chloroplasts convert light into chemical energy." },
      { label: "Mitochondria", sourceExcerpt: "Mitochondria generate ATP for cells." },
    ],
  });
  const first = await engine.next(session.id);
  if (first.done) throw new Error("missing first question");
  const wrong = await engine.submit(session.id, first.concept.id, {
    correctness: 0.12, completeness: 0.1, confidence: 0.98, userAnswer: "Unknown",
  });
  assert.equal(wrong.nextPolicy, "repair_then_retest");
  assert.equal(wrong.aha, undefined);
  const retry = await engine.next(session.id);
  if (retry.done) throw new Error("missing retest");
  assert.equal(retry.concept.id, first.concept.id, "AHA recovery targets same concept");
  assert.equal(retry.questionPolicy.type, "short_answer", "Retest must not repeat a multiple-choice guess");
  const improved = await engine.submit(session.id, retry.concept.id, {
    correctness: 0.95, completeness: 0.95, confidence: 0.94,
    userAnswer: "It converts sunlight into stored chemical energy.",
  });
  assert.equal(improved.aha?.variant, "recovery");
  assert.ok((improved.aha?.scoreAfter ?? 0) > (improved.aha?.scoreBefore ?? 1));
  const subsequent = await engine.next(session.id);
  if (!subsequent.done) {
    const after = await engine.submit(session.id, subsequent.concept.id, {
      correctness: 0.95, completeness: 0.95, confidence: 0.94,
      userAnswer: "Another graded answer",
    });
    assert.equal(after.aha, undefined, "Do not count the first AHA again");
  }
});

test("two independent good Learn answers yield honest mastery AHA, not simulated recovery", async () => {
  const source = new ContentSessionStore().create({
    title: "Cells", mode: "learn",
    contentText: "Chloroplasts capture light. Mitochondria produce ATP.",
  });
  const engine = new StudyEngine();
  const session = await engine.start(source, {
    mode: "learn", maxQuestions: 2, concepts: [
      { label: "Chloroplasts", sourceExcerpt: "Chloroplasts capture light." },
      { label: "Mitochondria", sourceExcerpt: "Mitochondria produce ATP." },
    ],
  });
  const first = await engine.next(session.id);
  if (first.done) throw new Error("missing first");
  const one = await engine.submit(session.id, first.concept.id, {
    correctness: 0.95, completeness: 0.94, confidence: 0.95,
  });
  assert.equal(one.aha, undefined);
  const second = await engine.next(session.id);
  if (second.done) throw new Error("missing second");
  assert.notEqual(second.concept.id, first.concept.id);
  const two = await engine.submit(session.id, second.concept.id, {
    correctness: 0.97, completeness: 0.95, confidence: 0.95,
  });
  assert.equal(two.aha?.variant, "demonstrated_mastery");
});

test("first question presentation is acknowledged once, only by its actual learner", async () => {
  const source = new ContentSessionStore().create({
    title: "Cells", mode: "learn",
    contentText: "A cell membrane selectively controls entry into the cell.",
  });
  const engine = new StudyEngine();
  const session = await engine.start(source, {
    learnerId: "owner-aha", mode: "learn",
    concepts: [{ label: "Cell membrane",
      sourceExcerpt: "A cell membrane selectively controls entry into the cell." }],
  });
  assert.equal(await engine.recordFirstQuestionPresented(session.id, "intruder"), false);
  assert.equal(await engine.recordFirstQuestionPresented(session.id, "owner-aha"), true);
  assert.equal(await engine.recordFirstQuestionPresented(session.id, "owner-aha"), false);
  const current = await engine.next(session.id);
  if (current.done) throw new Error("no first question");
  await engine.submit(session.id, current.concept.id, {
    correctness: 0.8, completeness: 0.8, confidence: 0.9,
  });
  assert.equal(await engine.recordFirstQuestionPresented(session.id, "owner-aha"), false);
});
