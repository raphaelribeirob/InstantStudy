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

test("true/false returns real answer options", () => {
  const a = generateQuestion({type:"true_false",concept,questionIndex:0});
  const b = generateQuestion({type:"true_false",concept,questionIndex:1});
  assert.deepEqual(a.choices?.map(c=>c.value), ["true","false"]);
  assert.notEqual(a.prompt,b.prompt);
});
test("Portuguese learning content produces Portuguese study questions", () => {
  const q = generateQuestion({type:"free_recall",concept:{label:"Fotossíntese",sourceExcerpt:"A fotossíntese transforma energia luminosa em energia química."}});
  assert.match(q.prompt,/Sem consultar as anotações/);
});
