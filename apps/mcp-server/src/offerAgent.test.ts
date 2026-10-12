import assert from "node:assert/strict";
import test from "node:test";
import {
  MemoryOfferPlanStore, buildOfferSteps, recommendOfferNext,
} from "./offerAgent.js";
import type { StudyMaterial } from "./materialStore.js";

const material: StudyMaterial = {
  id: "81e63e6b-a05f-4ae7-8789-823d66cf84ab",
  learnerId: "learner-one",
  title: "Photosynthesis",
  content: "Photosynthesis converts sunlight into chemical energy.",
  sourceType: "paste",
  sourceNames: [],
  assets: { summary: "Photosynthesis stores sunlight.", outline: ["Plants use light."],
    keyConcepts: ["Light"], flashcards: [], generatedBy: "deterministic" },
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

test("offer-first sequence includes actual material, quiz, test, FSRS and game features", () => {
  const steps = buildOfferSteps("Prepare for my biology exam in 10 days", 0);
  assert.deepEqual(steps.slice(0, 4).map(s => s.capability), [
    "guide", "flashcards", "ask", "learn",
  ]);
  assert.ok(steps.some(s => s.capability === "test"));
  assert.ok(steps.some(s => s.capability === "review"));
  assert.ok(steps.some(s => s.capability === "game"));
  assert.ok(!steps.some(s => (s as any).capability === "payments"));
});

test("listening goals include podcasts and team goals include authorized study rooms", () => {
  const capabilities = buildOfferSteps(
    "Listen to biology podcasts and study with my friends", 0,
  ).map(s => s.capability);
  assert.ok(capabilities.includes("audio"));
  assert.ok(capabilities.includes("friends"));
});

test("FSRS review takes priority when actual due concepts are present", async () => {
  const store = new MemoryOfferPlanStore();
  const plan = await store.create({
    learnerId: "learner-one", material,
    goal: "Pass the next exam", deadline: undefined,
  }, 2);
  const next = recommendOfferNext(plan, {
    dueCount: 2, weakConcepts: ["chlorophyll"],
  });
  assert.equal(next.next?.capability, "review");
  assert.match(next.reason, /FSRS/);
});

test("plans are learner-scoped and survive memory readback", async () => {
  const store = new MemoryOfferPlanStore();
  const plan = await store.create({ learnerId: "learner-one", material,
    goal: "Prepare for exam" }, 0);
  assert.equal((await store.getActive("learner-one", material.id))?.id, plan.id);
  assert.equal(await store.getActive("other-learner", material.id), null);
  await assert.rejects(() => store.complete(
    "other-learner", plan.id, "step-1", { kind: "acknowledgement" },
  ), /agent_plan_not_found/);
});

test("agent cannot mark Learn/Test/Review complete with a mere acknowledgement", async () => {
  const store = new MemoryOfferPlanStore();
  const plan = await store.create({ learnerId: "learner-one", material,
    goal: "Prepare for exam" }, 0);
  const learned = plan.steps.find(s => s.capability === "learn")!;
  const guide = plan.steps.find(s => s.capability === "guide")!;
  await assert.rejects(() => store.complete(
    "learner-one", plan.id, learned.id, { kind: "acknowledgement" },
  ), /agent_step_requires_graded_proof/);
  await assert.rejects(() => store.complete(
    "learner-one", plan.id, guide.id, { kind: "graded-session",
      studySessionId: "f1a25e71-a0f7-4f20-973d-0fb97a215ea0" },
  ), /agent_step_requires_graded_proof/);
  const completed = await store.complete(
    "learner-one", plan.id, guide.id, { kind: "acknowledgement" },
  );
  assert.equal(completed.steps.find(s => s.id === guide.id)?.completion?.kind,
    "acknowledgement");
  const stored = await store.getActive("learner-one", material.id);
  assert.equal(stored?.steps.find(s => s.id === guide.id)?.status, "completed");
});
