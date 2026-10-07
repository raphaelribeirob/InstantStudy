import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";

import { parsePaddleSignature, verifyPaddleSignature } from "./_security.js";

test("Paddle signature parser supports ts and multiple h1 values", () => {
  const parsed = parsePaddleSignature("ts=1700000000;h1=abc;h1=def");
  assert.equal(parsed.timestamp, 1700000000);
  assert.deepEqual(parsed.signatures, ["abc", "def"]);
});

test("Paddle signature verifies raw ts:body HMAC", () => {
  const rawBody = JSON.stringify({ event_id: "evt_test" });
  const timestamp = 1700000000;
  const secret = "pdl_ntfset_test";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}:${rawBody}`, "utf8")
    .digest("hex");

  const result = verifyPaddleSignature({
    rawBody,
    header: `ts=${timestamp};h1=${signature}`,
    secret,
    nowSeconds: timestamp,
    toleranceSeconds: 5,
  });
  assert.equal(result.ok, true);
});

test("Paddle signature rejects stale events", () => {
  const result = verifyPaddleSignature({
    rawBody: "{}",
    header: "ts=100;h1=abc",
    secret: "secret",
    nowSeconds: 1000,
    toleranceSeconds: 5,
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "stale_signature");
});
