"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { onExecutePostLogin } = require("./instantstudy-post-login.cjs");

const audience = "https://instantstudy-api.vercel.app";
function harness({ id = "student-A", resource = audience, secret = audience } = {}) {
  const added = [];
  const denied = [];
  const event = {
    secrets: { INSTANTSTUDY_MCP_AUDIENCE: secret },
    resource_server: { identifier: resource },
    user: { app_metadata: { instantstudy_learner_id: id } },
  };
  const api = {
    access: { deny: message => denied.push(message) },
    accessToken: { setCustomClaim: (key, value) => added.push([key, value]) },
  };
  return { event, api, added, denied };
}
test("Action adds only a verified namespaced account claim", async () => {
  const h = harness();
  await onExecutePostLogin(h.event, h.api);
  assert.deepEqual(h.added, [[audience + "/learner_id", "student-A"]]);
  assert.deepEqual(h.denied, []);
});
test("Action denies missing or user-controllable account binding", async () => {
  const h = harness({ id: undefined });
  delete h.event.user.app_metadata.instantstudy_learner_id;
  h.event.user.user_metadata = { instantstudy_learner_id: "attacker" };
  await onExecutePostLogin(h.event, h.api);
  assert.deepEqual(h.added, []);
  assert.deepEqual(h.denied, ["instantstudy_account_link_required"]);
});
test("Action leaves other API audiences unaffected", async () => {
  const h = harness({ resource: "https://different.example" });
  await onExecutePostLogin(h.event, h.api);
  assert.deepEqual(h.added, []);
  assert.deepEqual(h.denied, []);
});
test("Action denies when its secret is missing", async () => {
  const h = harness({ secret: "" });
  await onExecutePostLogin(h.event, h.api);
  assert.deepEqual(h.denied, ["instantstudy_mcp_configuration_missing"]);
});
