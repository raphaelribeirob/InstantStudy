import assert from "node:assert/strict";
import test from "node:test";
import { studyEntry, studyExit, studyMotion, studyTransition } from "../../web/src/motionTokens.js";

test("motion avoids large movement, unnecessary delays and layout properties", () => {
  assert.ok(studyMotion.standard <= 0.3);
  assert.ok(studyMotion.reveal <= 0.5);
  assert.ok(studyMotion.distance <= 12);
  assert.deepEqual(studyEntry(false), { opacity:0, y:12 });
  assert.deepEqual(studyExit(false), { opacity:0, y:-5 });
});

test("reduced motion preserves navigation feedback without transform", () => {
  assert.deepEqual(studyEntry(true), { opacity:0 });
  assert.deepEqual(studyExit(true), { opacity:0 });
  assert.equal(studyTransition(true).duration, 0.01);
  assert.equal(studyTransition(false).duration, 0.24);
  assert.equal(studyTransition(false,"fast").duration, 0.16);
});
