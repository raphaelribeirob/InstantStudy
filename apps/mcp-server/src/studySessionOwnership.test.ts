import { test } from "node:test";
import assert from "node:assert/strict";
import { ownsStudySession } from "./studySessionOwnership.js";

test("paid study sessions are accessible only to their owner", () => {
  const session = { learnerId: "learner-a" };
  assert.equal(ownsStudySession(session, "learner-a", true), true);
  assert.equal(ownsStudySession(session, "learner-b", true), false);
  assert.equal(ownsStudySession(session, undefined, true), false);
  assert.equal(ownsStudySession(null, "learner-a", true), false);
  assert.equal(ownsStudySession({ learnerId: undefined }, "learner-a", true), false);
});

test("local development can retain legacy unsigned session behavior", () => {
  assert.equal(ownsStudySession({ learnerId: "learner-a" }, undefined, false), true);
});
