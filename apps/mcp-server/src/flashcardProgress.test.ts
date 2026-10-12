import assert from "node:assert/strict";
import test from "node:test";
import { MemoryFlashcardProgressStore } from "./flashcardProgress.js";

test("known/learning cards remain isolated across learners and study sets", async () => {
  const store = new MemoryFlashcardProgressStore();
  await store.mark("learner-a", "set-one", "card-1", "known");
  await store.mark("learner-a", "set-two", "card-1", "learning");
  await store.mark("learner-b", "set-one", "card-1", "learning");
  assert.deepEqual(await store.list("learner-a", "set-one"), [{cardId:"card-1",status:"known"}]);
  assert.deepEqual(await store.list("learner-a", "set-two"), [{cardId:"card-1",status:"learning"}]);
  assert.deepEqual(await store.list("learner-b", "set-one"), [{cardId:"card-1",status:"learning"}]);
  await store.mark("learner-a", "set-one", "card-1", "learning");
  assert.deepEqual(await store.list("learner-a", "set-one"), [{cardId:"card-1",status:"learning"}]);
  assert.deepEqual(await store.list("learner-a", "set-three"), []);
});
