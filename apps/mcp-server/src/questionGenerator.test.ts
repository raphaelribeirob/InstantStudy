import assert from "node:assert/strict";
import test from "node:test";
import { generateQuestion, correctChoiceForQuestion } from "./questionGenerator.js";

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


test("false choice does not repeat the correct source text", () => {
  const question = generateQuestion({
    type: "true_false",
    concept,
    alternatives,
    questionIndex: 0,
  });

  const falseChoice = question.choices?.find((choice) => choice.label === "False");
  assert.ok(falseChoice);
  assert.doesNotMatch(falseChoice.value, /converts light energy into chemical energy/i);
});

test("cannot fabricate ungrounded multiple-choice distractors", () => {
  const question = generateQuestion({type:"multiple_choice", concept, alternatives:[]});
  assert.equal(question.answerMode,"text");
  assert.equal(question.choices,undefined);
});

test("advanced recall explicitly requires evidence and reasoning", () => {
  const question = generateQuestion({type:"free_recall",concept,testDifficulty:"advanced"});
  assert.match(question.prompt,/evidence|mechanism/i);
});

test("True/False is a real binary choice with a private source-backed answer key", () => {
  const yes = generateQuestion({
    type: "true_false", concept, alternatives, questionIndex: 0,
  });
  const no = generateQuestion({
    type: "true_false", concept, alternatives, questionIndex: 1,
  });
  assert.deepEqual(yes.choices?.map(x => x.value), ["True", "False"]);
  assert.deepEqual(no.choices?.map(x => x.value), ["True", "False"]);
  assert.equal(correctChoiceForQuestion({
    type: "true_false", concept, alternatives, questionIndex: 0,
  }), "True");
  assert.equal(correctChoiceForQuestion({
    type: "true_false", concept, alternatives, questionIndex: 1,
  }), "False");
  assert.notEqual(yes.prompt, no.prompt);
  assert.equal(JSON.stringify(no).includes("correctAnswer"), false);
});

test("without a source-grounded alternative, false claims fall back to text", () => {
  const q = generateQuestion({
    type: "true_false", concept, alternatives: [], questionIndex: 1,
  });
  assert.equal(q.answerMode, "text");
  assert.equal(q.choices, undefined);
  assert.equal(correctChoiceForQuestion({
    type: "true_false", concept, alternatives: [], questionIndex: 1,
  }), null);
});
