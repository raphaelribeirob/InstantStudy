import assert from "node:assert/strict";
import test from "node:test";
import { MemoryStudyRoomStore } from "./studyRoomStore.js";

test("study room supports create, join and real progress", async () => {
  const store = new MemoryStudyRoomStore();
  const created = await store.create({
    hostLearnerId: "learner-a",
    displayName: "A",
    title: "Biology",
    materialId: "11111111-1111-4111-8111-111111111111",
    summary: "Biology summary",
    concepts: ["Cells", "DNA"],
  });

  assert.equal(created.code.length, 6);
  assert.equal(created.members.length, 1);

  const joined = await store.join({
    code: created.code,
    learnerId: "learner-b",
    displayName: "B",
  });
  assert.equal(joined?.members.length, 2);

  const updated = await store.progress({
    code: created.code,
    learnerId: "learner-b",
    progress: 0.5,
    attempts: 5,
  });

  const member = updated?.members.find((item) => item.learnerId === "learner-b");
  assert.equal(member?.progress, 0.5);
  assert.equal(member?.attempts, 5);
});

test("unknown room cannot be joined", async () => {
  const store = new MemoryStudyRoomStore();
  const room = await store.join({
    code: "ABC123",
    learnerId: "learner-b",
    displayName: "B",
  });
  assert.equal(room, null);
});
