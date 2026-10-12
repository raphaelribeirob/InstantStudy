import test from "node:test";
import assert from "node:assert/strict";
import { gradeObjectiveChoice } from "./objectiveGrading.js";
import { generateQuestion, correctChoiceForQuestion } from "./questionGenerator.js";

const prompt = {
  choices: [
    { value: "Photosynthesis converts light energy into chemical energy." },
    { value: "Ribosomes synthesize protein from messenger RNA." },
    { value: "DNA replication duplicates genetic material." },
  ],
  expectedValue: "Photosynthesis converts light energy into chemical energy.",
  conceptLabel: "Photosynthesis",
};

test("objective scoring awards credit only to the real source-backed choice", () => {
  const grade = gradeObjectiveChoice({ ...prompt, userAnswer: prompt.expectedValue });
  assert.equal(grade.correctness, 1);
  assert.equal(grade.completeness, 1);
  assert.equal(grade.provider, "deterministic");
});

test("a displayed wrong alternative has zero credit", () => {
  const grade = gradeObjectiveChoice({ ...prompt, userAnswer: prompt.choices[1]!.value });
  assert.equal(grade.correctness, 0);
  assert.deepEqual(grade.missingConcepts, ["Photosynthesis"]);
});

test("forged out-of-choice text never reaches semantic credit", () => {
  const grade = gradeObjectiveChoice({
    ...prompt,
    userAnswer: "Photosynthesis converts light energy into chemical energy with chlorophyll.",
  });
  assert.equal(grade.correctness, 0);
  assert.equal(grade.confidence, 1);
});

test("no empty, whitespace or missing-list reply receives credit", () => {
  assert.equal(gradeObjectiveChoice({ ...prompt, choices: [], userAnswer: prompt.expectedValue }).correctness, 0);
  assert.equal(gradeObjectiveChoice({ ...prompt, userAnswer: "  " }).correctness, 0);
});

test("True/False alternatives are correctly scored, without grading semantic guesses", () => {
  const concept = { label: "Photosynthesis", sourceExcerpt: prompt.expectedValue };
  const alternatives = [{ label: "Replication", sourceExcerpt: prompt.choices[2]!.value }];
  const next = generateQuestion({
    type: "true_false", concept, alternatives, questionIndex: 1,
  });
  assert.equal(next.answerMode, "choice");
  const expectedValue = correctChoiceForQuestion({
    type: "true_false", concept, alternatives, questionIndex: 1,
  });
  assert.equal(expectedValue, "False");
  assert.equal(gradeObjectiveChoice({
    choices: next.choices ?? [], expectedValue: expectedValue ?? "",
    userAnswer: "False", conceptLabel: concept.label,
  }).correctness, 1);
  assert.equal(gradeObjectiveChoice({
    choices: next.choices ?? [], expectedValue: expectedValue ?? "",
    userAnswer: "True", conceptLabel: concept.label,
  }).correctness, 0);
});
