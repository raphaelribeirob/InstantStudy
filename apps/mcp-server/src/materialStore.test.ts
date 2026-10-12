import assert from "node:assert/strict";
import test from "node:test";
import { MemoryMaterialStore } from "./materialStore.js";
import { generateStudyAssets } from "./studyAssets.js";

test("material library is isolated by learner and searchable", async () => {
  const store = new MemoryMaterialStore();
  const content = "Photosynthesis converts light energy into chemical energy.";
  const assets = generateStudyAssets(content);

  await store.save({
    learnerId: "learner-a",
    title: "Biology notes",
    content,
    sourceType: "paste",
    sourceNames: [],
    assets,
  });
  await store.save({
    learnerId: "learner-b",
    title: "Private history",
    content: "The French Revolution began in 1789.",
    sourceType: "paste",
    sourceNames: [],
    assets: generateStudyAssets("The French Revolution began in 1789."),
  });

  const learnerA = await store.list("learner-a");
  assert.equal(learnerA.length, 1);
  assert.equal(learnerA[0]?.title, "Biology notes");

  const search = await store.list("learner-a", "photo");
  assert.equal(search.length, 1);

  const noLeak = await store.list("learner-a", "French");
  assert.equal(noLeak.length, 0);
});


test("material edits persist, preserve source, and never cross learner boundaries", async () => {
  const store = new MemoryMaterialStore();
  const content = "The process of cellular respiration transfers energy to ATP in cells.";
  const material = await store.save({
    learnerId: "learner-a",
    title: "Original title",
    content,
    sourceType: "paste",
    sourceNames: [],
    assets: generateStudyAssets(content),
  });
  const revised = {
    ...material.assets,
    summary: "Cellular respiration produces ATP for cellular work.",
    outline: ["Glucose breakdown", "ATP generation"],
    keyConcepts: ["Cellular respiration"],
    flashcards: [{id:"card-custom",front:"What does cellular respiration produce?",back:"ATP",concept:"Cellular respiration"}],
  };
  assert.equal(await store.update("learner-b", material.id, { title:"Stolen", assets:revised }), null);
  const updated = await store.update("learner-a", material.id, {title:"Energy guide",assets:revised});
  assert.equal(updated?.title, "Energy guide");
  assert.equal(updated?.assets.flashcards[0]?.front, revised.flashcards[0].front);
  assert.equal(updated?.content, content);
  const refetched = await store.get("learner-a", material.id);
  assert.deepEqual(refetched?.assets, revised);
  assert.equal((await store.get("learner-b", material.id)), null);
});
