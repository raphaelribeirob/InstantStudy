import assert from "node:assert/strict";
import test from "node:test";
import { expanded } from "./entitlements.js";
const row = (key, status, active, expires_at) => ({
  entitlement_key: key, status, active, expires_at,
});
const future="2099-01-01T00:00:00Z";
const past="2020-01-01T00:00:00Z";
test("Hardwall: expired entitlements never grant a subscription", () => {
  const result=expanded([row("instant_study.plus","active",true,past)]);
  assert.equal(result[0].active,false);
});
test("Hardwall: canceled/paused/past_due entitlements never grant access", () => {
  for (const status of ["canceled","paused","past_due","expired"]) {
    assert.equal(expanded([row("instant_study.unlimited",status,true,future)])[0].active,false);
  }
});
test("Hardwall: active non-expired Plus grants access", () => {
  assert.equal(expanded([row("instant_study.plus","active",true,future)])[0].active,true);
});
test("Hardwall: expired family owner cannot grant family upgrade", () => {
  const keys=expanded([row("instant_study.family","active",true,past)]).filter(x=>x.active).map(x=>x.key);
  assert.equal(keys.includes("instant_study.unlimited"),false);
});
