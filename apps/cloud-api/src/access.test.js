import assert from "node:assert/strict";
import test from "node:test";
import { projectInstantAccess } from "./access.js";

const now = Date.parse("2026-10-13T17:00:00Z");
test("Instant Pass enables all product entitlements when InstantPay says active", () => {
  const out = projectInstantAccess([{ key: "instant_one.all", active: true }], now);
  for (const x of Object.values(out)) {
    assert.equal(x.active, true);
    assert.equal(x.source, "instant_pass");
  }
});

test("Individual products and family access never expand to unrelated products", () => {
  const out = projectInstantAccess([
    { key: "instant_study.family_member", active: true },
    { key: "instant_speak.pro", active: false },
  ], now);
  assert.equal(out.instant_study.active, true);
  assert.equal(out.instant_bible.active, false);
  assert.equal(out.instant_speak.active, false);
});

test("Expired, malformed and revoked entitlements cannot grant access", () => {
  for(const expires_at of ["2026-10-12T20:00:00Z","not-a-timestamp"]) {
    assert.equal(projectInstantAccess([{
      key:"instant_one.all", active:true, expires_at,
    }],now).instant_speak.active,false);
  }
  const ended=projectInstantAccess([{key:"instant_one.all",active:false}],now);
  assert.equal(ended.instant_study.active,false);
});
