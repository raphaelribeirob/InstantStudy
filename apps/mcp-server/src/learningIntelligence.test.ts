import assert from "node:assert/strict";
import test from "node:test";
import {
  deterministicGrade,
  extractiveAnswer,
  shouldEscalateGrade,
} from "./learningIntelligence.js";

test("blank answers are rejected deterministically without an LLM", () => {
  const grade = deterministicGrade({
    conceptLabel: "Photosynthesis",
    sourceExcerpt:
      "Photosynthesis converts light energy into chemical energy in chloroplasts using chlorophyll.",
    userAnswer: "",
  });

  assert.equal(grade.provider, "deterministic");
  assert.equal(grade.correctness, 0);
  assert.equal(shouldEscalateGrade(grade), false);
});

test("high-overlap answers stay on the deterministic path", () => {
  const grade = deterministicGrade({
    conceptLabel: "Photosynthesis",
    sourceExcerpt:
      "Photosynthesis converts light energy into chemical energy in chloroplasts using chlorophyll.",
    userAnswer:
      "Photosynthesis converts light energy into chemical energy in chloroplasts using chlorophyll.",
  });

  assert.ok(grade.confidence >= 0.8);
  assert.equal(shouldEscalateGrade(grade), false);
});

test("ambiguous low-overlap answers are escalated for semantic grading", () => {
  const grade = deterministicGrade({
    conceptLabel: "Photosynthesis",
    sourceExcerpt:
      "Photosynthesis converts light energy into chemical energy in chloroplasts using chlorophyll.",
    userAnswer: "Plants use sunlight to store energy.",
  });

  assert.ok(grade.confidence < 0.8);
  assert.equal(shouldEscalateGrade(grade), true);
});

test("extractive Ask returns grounded source highlights", () => {
  const result = extractiveAnswer(
    "Mitochondria generate ATP through cellular respiration. Ribosomes synthesize proteins from messenger RNA.",
    "What generates ATP through cellular respiration?",
  );

  assert.equal(result.provider, "extractive");
  assert.match(result.answer, /Mitochondria/i);
  assert.ok((result.confidence ?? 0) > 0);
});
