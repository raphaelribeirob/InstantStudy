import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import { verifyInstantCloserHandoff } from "./_handoff.js";

function makeToken(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encoded, "utf8")
    .digest("hex");
  return `${encoded}.${signature}`;
}

test("InstantCloser handoff preserves signed company identity", () => {
  process.env.INSTANT_CLOSER_SHARED_SECRET = "test-secret";
  const now = Math.floor(Date.now() / 1000);
  const token = makeToken(
    {
      company_id: 42,
      offer: "instant_closer_pro_monthly",
      source: "instant_closer",
      iat: now,
      exp: now + 600,
    },
    "test-secret",
  );

  const result = verifyInstantCloserHandoff(token, "instant_closer");
  assert.equal(result.companyId, "42");
  assert.equal(result.offer, "instant_closer_pro_monthly");
});

test("InstantCloser handoff rejects tampering", () => {
  process.env.INSTANT_CLOSER_SHARED_SECRET = "test-secret";
  const now = Math.floor(Date.now() / 1000);
  const token = makeToken(
    {
      company_id: 42,
      offer: "instant_closer_pro_monthly",
      source: "instant_closer",
      iat: now,
      exp: now + 600,
    },
    "other-secret",
  );

  assert.throws(
    () => verifyInstantCloserHandoff(token, "instant_closer"),
    /handoff_invalid/,
  );
});
