import assert from "node:assert/strict";
import test from "node:test";
import { generateQuestion } from "./questionGenerator.js";

const concept = {
  label: "Photosynthesis",
  sourceExcerpt:
    "Photosynthesis converts light energy into chemical energy in chloroplasts.",
};

const alternatives = [
  {
    label: "Respiration",
    sourceExcerpt:
      "Cellular respiration releases usable energy from organic molecules.",
  },
  {
    label: "Translation",
    sourceExcerpt:
      "Ribosomes translate messenger RNA into a sequence of amino acids.",
  },
  {
    label: "Replication",
    sourceExcerpt:
      "DNA replication copies genetic material before cell division.",
  },
];

test("multiple choice returns a concrete grounded question", () => {
  const question = generateQuestion({
    type: "multiple_choice",
    concept,
    alternatives,
    questionIndex: 0,
  });

  assert.match(question.prompt, /Photosynthesis/);
  assert.equal(question.answerMode, "choice");
  assert.equal(question.choices?.length, 4);
  assert.ok(question.choices?.some((choice) => choice.value === concept.sourceExcerpt));
});

test("written modes return a learner-facing prompt, not an engine instruction", () => {
  const question = generateQuestion({
    type: "free_recall",
    concept,
  });

  assert.equal(question.answerMode, "text");
  assert.match(question.prompt, /explain Photosynthesis/i);
  assert.doesNotMatch(question.prompt, /Ask exactly one|question policy/i);
});
