import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { hardPaywallServiceEnabled, isSignedBffRequest } from "./hardPaywallSignature.js";

const prevFlag = process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED;
const prevSecret = process.env.INSTANTSTUDY_BFF_SIGNING_SECRET;
afterEach(() => {
  if (prevFlag === undefined) delete process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED;
  else process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED = prevFlag;
  if (prevSecret === undefined) delete process.env.INSTANTSTUDY_BFF_SIGNING_SECRET;
  else process.env.INSTANTSTUDY_BFF_SIGNING_SECRET = prevSecret;
});

const secret = "local-test-only-instantstudy-secret-64-bytes-not-production";
function create(input: { method?: string; path?: string; body?: unknown; now?: number }) {
  const timestamp = String(input.now ?? Date.now());
  const method = input.method ?? "POST";
  const path = input.path ?? "/api/v1/study/prepare";
  const body = input.body ?? { title: "Paper" };
  const bodyText = method === "GET" ? "" : JSON.stringify(body);
  const signature = createHmac("sha256", secret)
    .update([timestamp, method, path, bodyText].join("\n"))
    .digest("hex");
  return { method, path, body, timestamp, signature };
}

test("feature flag is opt-in", () => {
  delete process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED;
  assert.equal(hardPaywallServiceEnabled(), false);
  process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED = "true";
  assert.equal(hardPaywallServiceEnabled(), true);
});

test("accepts only a fresh correctly signed API request", () => {
  process.env.INSTANTSTUDY_BFF_SIGNING_SECRET = secret;
  const now = Date.now();
  const signed = create({ now });
  assert.equal(isSignedBffRequest(signed, now), true);
  assert.equal(isSignedBffRequest({ ...signed, path: "/api/v1/study/finish" }, now), false);
  assert.equal(isSignedBffRequest({ ...signed, method: "GET" }, now), false);
  assert.equal(isSignedBffRequest({ ...signed, body: { title: "Altered" } }, now), false);
  assert.equal(isSignedBffRequest(signed, now + 31_000), false);
  assert.equal(isSignedBffRequest({ ...signed, signature: "0".repeat(64) }, now), false);
});

test("empty/missing secret fails closed even for otherwise correct calls", () => {
  const signed = create({});
  delete process.env.INSTANTSTUDY_BFF_SIGNING_SECRET;
  assert.equal(isSignedBffRequest(signed), false);
});

test("signed GET allows query but denies tampering", () => {
  process.env.INSTANTSTUDY_BFF_SIGNING_SECRET = secret;
  const signed = create({ method: "GET", path: "/api/v1/study/due?learnerId=abc" });
  assert.equal(isSignedBffRequest(signed), true);
  assert.equal(isSignedBffRequest({ ...signed, path: "/api/v1/study/due?learnerId=xyz" }), false);
});

test("hosted Study API stays signed-paywall protected when flag is unset or false", () => {
  const previous = process.env.VERCEL;
  try {
    process.env.VERCEL = "1";
    delete process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED;
    assert.equal(hardPaywallServiceEnabled(), true);
    process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED = "false";
    assert.equal(hardPaywallServiceEnabled(), true);
    delete process.env.INSTANTSTUDY_BFF_SIGNING_SECRET;
    assert.equal(isSignedBffRequest(create({})), false);
  } finally {
    if (previous === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previous;
  }
});
