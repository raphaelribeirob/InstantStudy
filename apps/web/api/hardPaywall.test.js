import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import handler from "./study.js";
import { resolveHardPaywallAccess, signedUpstreamHeaders } from "./_hardPaywall.js";

const originalEnv = {
  flag: process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED,
  secret: process.env.INSTANTSTUDY_BFF_SIGNING_SECRET,
  api: process.env.INSTANTSTUDY_API_URL,
  key: process.env.INSTANTSTUDY_API_KEY,
};
const originalFetch = globalThis.fetch;

afterEach(() => {
  for (const [k, name] of Object.entries({
    flag: "INSTANTSTUDY_HARD_PAYWALL_ENABLED",
    secret: "INSTANTSTUDY_BFF_SIGNING_SECRET",
    api: "INSTANTSTUDY_API_URL",
    key: "INSTANTSTUDY_API_KEY",
  })) {
    if (originalEnv[k] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[k];
  }
  globalThis.fetch = originalFetch;
});

function enabled() {
  process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED = "true";
  process.env.INSTANTSTUDY_BFF_SIGNING_SECRET = "example-only-not-a-real-secret-replace-in-production";
}

const user = {
  learnerId: "account-123",
  accountUserId: "account-123",
  accountAccessToken: "test-token-not-a-real-bearer",
};

function mockResponse(status = 200, payload = {}) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function responseCollector() {
  return {
    code: -1, headers: {}, body: null,
    status(code) { this.code = code; return this; },
    setHeader(name, value) { this.headers[name] = value; return this; },
    end(value) { this.body = JSON.parse(value); return this; },
  };
}

test("hard paywall stays disabled until an operator explicitly enables it", async () => {
  delete process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED;
  const state = await resolveHardPaywallAccess({});
  assert.equal(state.authorized, true);
  assert.equal(state.enabled, false);
});

test("misconfigured signing secret fails closed", async () => {
  enabled();
  delete process.env.INSTANTSTUDY_BFF_SIGNING_SECRET;
  const state = await resolveHardPaywallAccess(user);
  assert.equal(state.status, 503);
  assert.equal(state.authorized, false);
});

test("forged and anonymous identities cannot reach billing", async () => {
  enabled();
  let called = false;
  for (const payload of [
    { ...user, learnerId: "account-other" },
    { ...user, learnerId: "web-12345678", accountUserId: "web-12345678" },
    {},
  ]) {
    const state = await resolveHardPaywallAccess(payload, async () => {
      called = true;
      throw new Error("should not fetch");
    });
    assert.equal(state.status, 401);
    assert.equal(state.authorized, false);
  }
  assert.equal(called, false);
});

test("verified active Plus/Unlimited/Family/Instant One unlocks the product", async () => {
  enabled();
  for (const key of [
    "instant_study.plus", "instant_study.unlimited",
    "instant_study.family_member", "instant_one.all",
  ]) {
    const state = await resolveHardPaywallAccess(user, async (url, options) => {
      assert.match(url, /user_id=account-123/);
      assert.equal(options.headers.authorization, "Bearer " + user.accountAccessToken);
      return mockResponse(200, { entitlements: [{ key, active: true }] });
    });
    assert.equal(state.authorized, true);
    assert.equal(state.plan, key === "instant_study.plus" ? "plus" : "unlimited");
  }
});

test("inactive subscription is blocked and billing outages do not unlock", async () => {
  enabled();
  let result = await resolveHardPaywallAccess(user, async () => mockResponse(200, {
    entitlements: [{ key: "instant_study.unlimited", active: false }],
  }));
  assert.equal(result.status, 402);
  result = await resolveHardPaywallAccess(user, async () => mockResponse(503));
  assert.equal(result.status, 503);
  result = await resolveHardPaywallAccess(user, async () => mockResponse(200, {}));
  assert.equal(result.status, 503);
});

test("signed proof covers timestamp, route, method and exact body", () => {
  enabled();
  const body = JSON.stringify({ action: "prepare", learnerId: user.learnerId });
  const path = "/api/v1/study/prepare";
  const headers = signedUpstreamHeaders("POST", path, body);
  const expected = createHmac("sha256", process.env.INSTANTSTUDY_BFF_SIGNING_SECRET)
    .update([headers["x-instantstudy-timestamp"], "POST", path, body].join("\n"))
    .digest("hex");
  assert.equal(headers["x-instantstudy-signature"], expected);
});

test("all study requests are blocked before calling privileged upstream", async () => {
  enabled();
  process.env.INSTANTSTUDY_API_URL = "https://api.instantstudy.test";
  process.env.INSTANTSTUDY_API_KEY = "test-only-privileged-token";
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error("must not call upstream"); };

  const req = { method: "POST", headers: {}, body: { action: "prepare", learnerId: "web-123456789", contentText: "History" } };
  const res = responseCollector();
  await handler(req, res);
  assert.equal(res.code, 401);
  assert.equal(res.body.error, "account_required");
  assert.equal(networkCalls, 0);
});

test("paywall status is safe to query without provisioning the study backend", async () => {
  enabled();
  delete process.env.INSTANTSTUDY_API_URL;
  delete process.env.INSTANTSTUDY_API_KEY;
  const req = { method: "POST", headers: {}, body: { action: "paywall_status" } };
  const res = responseCollector();
  await handler(req, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.enabled, true);
  assert.equal(res.body.authorized, false);
});
