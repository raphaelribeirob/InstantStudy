import assert from "node:assert/strict";
import test from "node:test";
import {
  canGrantPaidStudy,
  matchesCurrentPaywallRequest,
} from "../../web/src/paidAccessGuard.js";

const alice = { userId: "alice", accessToken: "alice-token" };
const bob = { userId: "bob", accessToken: "bob-token" };
const allowed = { enabled: true, authorized: true, plan: "plus" as const };

test("only the latest verified, paid request may render the study app", () => {
  assert.equal(canGrantPaidStudy(allowed, alice, alice, 2, 2), true);
  assert.equal(canGrantPaidStudy(allowed, alice, alice, 1, 2), false);
  assert.equal(canGrantPaidStudy(allowed, alice, bob, 2, 2), false);
  assert.equal(canGrantPaidStudy(allowed, alice, null, 2, 2), false);
  assert.equal(canGrantPaidStudy(allowed, alice, { ...alice, accessToken:"rotated" }, 2, 2), false);
  assert.equal(canGrantPaidStudy(allowed, null, null, 2, 2), false);
  assert.equal(canGrantPaidStudy({ ...allowed, authorized:false }, alice, alice, 2, 2), false);
  assert.equal(canGrantPaidStudy({ ...allowed, enabled:false }, alice, alice, 2, 2), false);
  assert.equal(canGrantPaidStudy({ enabled:true, authorized:true, plan:null }, alice, alice, 2, 2), false);
  assert.equal(canGrantPaidStudy({ enabled:true, authorized:true }, alice, alice, 2, 2), false);
  assert.equal(canGrantPaidStudy({ ...allowed, plan:"unlimited" }, alice, alice, 2, 2), true);
});

test("stale and cross-user access check errors cannot override current state", () => {
  assert.equal(matchesCurrentPaywallRequest(alice, alice, 9, 9), true);
  assert.equal(matchesCurrentPaywallRequest(alice, alice, 8, 9), false);
  assert.equal(matchesCurrentPaywallRequest(alice, bob, 9, 9), false);
  assert.equal(matchesCurrentPaywallRequest(alice, null, 9, 9), false);
});
