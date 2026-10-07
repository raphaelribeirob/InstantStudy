import assert from "node:assert/strict";
import crypto from "node:crypto";
import test, { afterEach } from "node:test";

import { resolveOffer } from "./_catalog.js";
import { verifyPaddleSignature } from "./_paddle.js";

afterEach(() => {
  delete process.env.PADDLE_WEBHOOK_SECRET;
  delete process.env.PADDLE_WEBHOOK_TOLERANCE_SECONDS;
  delete process.env.PADDLE_PRICE_INSTANT_STUDY_PLUS_ANNUAL;
});

test("Paddle webhook signature accepts a fresh valid HMAC", () => {
  process.env.PADDLE_WEBHOOK_SECRET = "test-secret";
  process.env.PADDLE_WEBHOOK_TOLERANCE_SECONDS = "300";

  const rawBody = JSON.stringify({ event_id: "evt_test", event_type: "transaction.completed" });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", "test-secret")
    .update(timestamp + ":" + rawBody, "utf8")
    .digest("hex");

  assert.doesNotThrow(() =>
    verifyPaddleSignature(rawBody, "ts=" + timestamp + ";h1=" + signature),
  );
});

test("Paddle webhook signature rejects stale timestamps", () => {
  process.env.PADDLE_WEBHOOK_SECRET = "test-secret";
  process.env.PADDLE_WEBHOOK_TOLERANCE_SECONDS = "60";

  const rawBody = "{}";
  const timestamp = Math.floor(Date.now() / 1000) - 3600;
  const signature = crypto
    .createHmac("sha256", "test-secret")
    .update(timestamp + ":" + rawBody, "utf8")
    .digest("hex");

  assert.throws(
    () => verifyPaddleSignature(rawBody, "ts=" + timestamp + ";h1=" + signature),
    /stale/,
  );
});

test("billing only resolves allowlisted configured offers", () => {
  process.env.PADDLE_PRICE_INSTANT_STUDY_PLUS_ANNUAL =
    "pri_12345678901234567890";

  assert.equal(resolveOffer("not_a_real_offer"), null);
  assert.equal(resolveOffer("instant_study_plus_annual")?.entitlement, "instant_study.plus");
});
