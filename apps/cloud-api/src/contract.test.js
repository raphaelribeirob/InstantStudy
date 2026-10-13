import assert from "node:assert/strict";
import test from "node:test";
import { eventSchema, pageSchema, validateEvent } from "./contract.js";

const good = {
  eventId: "bcf9824a-ab50-4b6f-9013-51b131950c95",
  product: "instant_study",
  kind: "session_completed",
  occurredAt: "2026-10-13T14:20:00-03:00",
  metrics: { durationSeconds: 300, score: 0.9 },
};

test("Canonical progress event is validated", () => {
  const evt = validateEvent(good, Date.parse("2026-10-13T18:00:00Z"));
  assert.equal(evt.product, "instant_study");
  assert.equal(evt.metrics.durationSeconds, 300);
  assert.equal(pageSchema.parse({ limit: "25" }).limit, 25);
});

test("Shared sync contract rejects private study contents, invalid products and future events", () => {
  assert.equal(eventSchema.safeParse({ ...good, text: "private study document" }).success, false);
  assert.equal(eventSchema.safeParse({ ...good, metrics: { body: "a private journal" } }).success, false);
  assert.equal(eventSchema.safeParse({ ...good, product: "instant_other" }).success, false);
  assert.throws(() => validateEvent({ ...good, occurredAt: "2100-01-01T00:00:00Z" }));
  assert.equal(pageSchema.safeParse({ limit: 10000 }).success, false);
});
