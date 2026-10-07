import test from "node:test";
import assert from "node:assert/strict";

import { entitlementMutationFromPaddleEvent } from "./_entitlement.js";

const custom = {
  subject_id: "instant_closer:company:42",
  entitlement_key: "instant_closer.pro",
  product_key: "instant_closer",
  plan_key: "pro",
};

test("completed transaction activates entitlement and records subscription", () => {
  const mutation = entitlementMutationFromPaddleEvent({
    event_type: "transaction.completed",
    data: {
      id: "txn_123",
      subscription_id: "sub_123",
      custom_data: custom,
    },
  });

  assert.equal(mutation.subjectId, "instant_closer:company:42");
  assert.equal(mutation.entitlementKey, "instant_closer.pro");
  assert.equal(mutation.active, true);
  assert.equal(mutation.externalTransactionId, "txn_123");
  assert.equal(mutation.externalSubscriptionId, "sub_123");
});

test("subscription cancellation deactivates entitlement", () => {
  const mutation = entitlementMutationFromPaddleEvent({
    event_type: "subscription.canceled",
    data: {
      id: "sub_123",
      status: "canceled",
      custom_data: custom,
    },
  });

  assert.equal(mutation.active, false);
  assert.equal(mutation.status, "canceled");
  assert.equal(mutation.externalSubscriptionId, "sub_123");
});

test("event without server-bound subject cannot mutate entitlements", () => {
  const mutation = entitlementMutationFromPaddleEvent({
    event_type: "transaction.completed",
    data: {
      id: "txn_public",
      custom_data: { entitlement_key: "instant_closer.pro" },
    },
  });

  assert.equal(mutation, null);
});
