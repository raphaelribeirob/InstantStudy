export function entitlementMutationFromPaddleEvent(event) {
  const type = String(event?.event_type || "");
  const data = event?.data && typeof event.data === "object" ? event.data : {};
  const custom =
    data?.custom_data && typeof data.custom_data === "object"
      ? data.custom_data
      : {};

  const subjectId = String(custom.subject_id || "").trim();
  const entitlementKey = String(custom.entitlement_key || "").trim();
  if (!subjectId || !entitlementKey) return null;

  let active;
  let status;

  if (type === "transaction.completed") {
    active = true;
    status = "active";
  } else if (type.startsWith("subscription.")) {
    status = String(data.status || type.slice("subscription.".length) || "unknown");
    active = status === "active" || status === "trialing";
  } else if (
    type === "transaction.payment_failed" ||
    type === "transaction.past_due" ||
    type === "transaction.canceled"
  ) {
    active = false;
    status = type.split(".")[1];
  } else {
    return null;
  }

  const subscriptionId = type.startsWith("subscription.")
    ? data.id
    : data.subscription_id;
  const transactionId = type.startsWith("transaction.") ? data.id : null;
  const expiresAt =
    data?.current_billing_period?.ends_at ||
    data?.billing_period?.ends_at ||
    data?.next_billed_at ||
    null;

  return {
    subjectId,
    entitlementKey,
    active,
    status,
    provider: "paddle",
    productKey: custom.product_key ? String(custom.product_key) : null,
    planKey: custom.plan_key ? String(custom.plan_key) : null,
    externalTransactionId: transactionId ? String(transactionId) : null,
    externalSubscriptionId: subscriptionId ? String(subscriptionId) : null,
    expiresAt: expiresAt ? String(expiresAt) : null,
  };
}
