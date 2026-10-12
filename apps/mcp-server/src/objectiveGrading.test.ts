import test from "node:test";
import assert from "node:assert/strict";
import { gradeObjectiveChoice } from "./objectiveGrading.js";

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
