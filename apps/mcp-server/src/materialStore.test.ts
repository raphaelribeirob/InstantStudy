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
