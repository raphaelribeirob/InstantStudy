import assert from "node:assert/strict";
import test from "node:test";
import {
  studyMaterialLanguage,
  verifyGeneratedStudyAssets,
  generatePedagogicalStudyAssets,
} from "./studyAssetIntelligence.js";

const source = [
  "A fotossíntese converte energia luminosa em energia química nos cloroplastos.",
  "A clorofila absorve a luz necessária para impulsionar reações fotoquímicas.",
  "O ciclo de Calvin utiliza dióxido de carbono para formar moléculas orgânicas.",
  "ATP e NADPH fornecem energia e poder redutor para a fixação de carbono.",
].join(" ");

const evidence = [
  "A fotossíntese converte energia luminosa em energia química nos cloroplastos.",
  "A clorofila absorve a luz necessária para impulsionar reações fotoquímicas.",
  "O ciclo de Calvin utiliza dióxido de carbono para formar moléculas orgânicas.",
  "ATP e NADPH fornecem energia e poder redutor para a fixação de carbono.",
];
function valid() {
  return {
    summary: "A fotossíntese armazena energia luminosa e o ciclo de Calvin fixa carbono.",
    outline: ["A clorofila absorve luz e aciona reações.", "O ciclo de Calvin fixa dióxido de carbono."],
    keyConcepts: ["Fotossíntese", "Clorofila", "Calvin", "ATP"],
    flashcards: evidence.map((quote, index) => ({
      front: ["O que a fotossíntese converte?", "Qual é a função da clorofila?", "O que o ciclo de Calvin utiliza?", "Qual a função do ATP e NADPH?"][index],
      back: quote,
      concept: ["Fotossíntese", "Clorofila", "Calvin", "ATP"][index],
      evidence: quote,
    })),
  };
}

test("detects Portuguese source to keep flashcards in learner's language", () => {
  assert.equal(studyMaterialLanguage(source), "pt-BR");
});

test("accepts only structured cards backed by exact source evidence", () => {
  const result = verifyGeneratedStudyAssets(source, valid());
  assert.equal(result?.generatedBy, "openai");
  assert.equal(result?.flashcards.length, 4);
  assert.equal(result?.flashcards[0].sourceExcerpt, evidence[0]);
});

test("rejects unsupported examples and never saves ungrounded cards", () => {
  const bad = valid();
  bad.flashcards = bad.flashcards.map(x => ({ ...x, evidence: "Astronauts invented photosynthesis on Mars." }));
  assert.equal(verifyGeneratedStudyAssets(source, bad), null);
});

test("falls back without calling OpenAI if asset generation has no feature flag", async () => {
  const previous = process.env.INSTANTSTUDY_AI_ASSETS_ENABLED;
  process.env.INSTANTSTUDY_AI_ASSETS_ENABLED = "false";
  try {
    const result = await generatePedagogicalStudyAssets(source);
    assert.equal(result.generatedBy, "deterministic");
    assert.ok(result.flashcards[0]?.front.startsWith("O que é importante lembrar"));
  } finally {
    if (previous === undefined) delete process.env.INSTANTSTUDY_AI_ASSETS_ENABLED;
    else process.env.INSTANTSTUDY_AI_ASSETS_ENABLED = previous;
  }
});
