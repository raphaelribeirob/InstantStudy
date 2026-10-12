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

test("multiple choice prioritizes topic-adjacent distractors and rejects duplicate concepts", () => {
  const alternativesMixed = [
    {label:"History",sourceExcerpt:"Roman emperors ruled the ancient Mediterranean world."},
    {label:"Chloroplast anatomy",sourceExcerpt:"Chloroplast membranes contain pigments that capture light energy."},
    {label:"Chlorophyll",sourceExcerpt:"Chlorophyll molecules absorb photons within chloroplast structures."},
    {label:"Photosynthesis",sourceExcerpt:"Photosynthesis converts light energy into chemical energy in chloroplasts using chlorophyll."},
    {label:"Cell biology",sourceExcerpt:"Cells contain organelles that store chemical energy."},
  ];
  const question = generateQuestion({type:"multiple_choice",concept,alternatives:alternativesMixed});
  assert.equal(question.answerMode,"choice");
  assert.equal(question.choices?.length,4);
  const options = question.choices?.map(x=>x.value) || [];
  assert.ok(options.some(x=>x.includes("Chloroplast membranes")));
  assert.ok(options.some(x=>x.includes("Chlorophyll molecules")));
  assert.equal(options.some(x=>x.includes("Roman emperors")),false);
});

test("multiple choice falls back to written recall when all alternatives reuse the same concept", () => {
  const question = generateQuestion({type:"multiple_choice",concept,
    alternatives:[
      {label:"Photosynthesis",sourceExcerpt:"Photosynthesis happens in chloroplasts."},
      {label:"Photosynthesis",sourceExcerpt:"Plants use photosynthesis."},
      {label:"Photosynthesis",sourceExcerpt:"Photosynthesis captures sunlight."},
    ]});
  assert.equal(question.answerMode,"text");
});
