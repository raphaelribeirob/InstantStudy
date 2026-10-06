import { offerMetadata } from "./_catalog.js";
import {
  recordEvent,
  updateSubscriptionState,
  upsertEntitlement,
} from "./_db.js";
import {
  fetchPaddleCustomer,
  readRawBody,
  verifyPaddleSignature,
} from "./_paddle.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

function json(res, status, body) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.status(status);
  return res.end(JSON.stringify(body));
}

function activeSubscription(status) {
  return status === "active" || status === "trialing";
}

function expiration(data) {
  return data?.current_billing_period?.ends_at || data?.next_billed_at || null;
}

async function identityFor(data) {
  const customerId = String(data?.customer_id || "").trim();
  const customer = customerId ? await fetchPaddleCustomer(customerId) : null;
  return {
    customerId: customerId || null,
    email: String(customer?.email || "").trim().toLowerCase() || null,
  };
}

async function provisionFromData(data, statusOverride) {
  const custom = data?.custom_data || {};
  const meta = offerMetadata(custom.offer_key);
  if (!meta) return false;

  const identity = await identityFor(data);
  const status = statusOverride || String(data?.status || "unknown");
  const subscriptionId = String(
    data?.subscription_id || (String(data?.id || "").startsWith("sub_") ? data.id : "")
  ).trim() || null;

  await upsertEntitlement({
    entitlementKey: meta.entitlement,
    productKey: meta.product,
    planKey: meta.plan,
    userRef: String(custom.user_ref || "").trim() || null,
    email: identity.email,
    paddleCustomerId: identity.customerId,
    paddleSubscriptionId: subscriptionId,
    active: status === "completed" || activeSubscription(status),
    status,
    expiresAt: expiration(data),
    source: String(custom.source_app || "instant_pay"),
  });
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  let rawBody;
  try {
    rawBody = await readRawBody(req);
    verifyPaddleSignature(rawBody, req.headers["paddle-signature"]);
  } catch (error) {
    console.error("Paddle webhook signature rejected", error?.message || "unknown");
    return json(res, 401, { error: "invalid_signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json(res, 400, { error: "invalid_json" });
  }

  const eventId = String(event?.event_id || "");
  const eventType = String(event?.event_type || "");
  if (!eventId || !eventType) return json(res, 400, { error: "invalid_event" });

  try {
    const inserted = await recordEvent({
      eventId,
      eventType,
      occurredAt: event?.occurred_at || null,
      payload: event,
    });
    if (!inserted) return json(res, 200, { received: true, duplicate: true });

    const data = event?.data || {};
    if (eventType === "transaction.completed") {
      await provisionFromData(data, "completed");
    } else if (
      eventType === "subscription.created" ||
      eventType === "subscription.activated" ||
      eventType === "subscription.trialing"
    ) {
      const provisioned = await provisionFromData(data);
      if (!provisioned) {
        await updateSubscriptionState({
          subscriptionId: data.id,
          active: true,
          status: String(data.status || "active"),
          expiresAt: expiration(data),
        });
      }
    } else if (
      eventType === "subscription.updated" ||
      eventType === "subscription.paused" ||
      eventType === "subscription.resumed" ||
      eventType === "subscription.canceled" ||
      eventType === "subscription.past_due"
    ) {
      await updateSubscriptionState({
        subscriptionId: data.id,
        active: activeSubscription(String(data.status || "")),
        status: String(data.status || eventType.split(".")[1] || "unknown"),
        expiresAt: expiration(data),
      });
    }

    return json(res, 200, { received: true, duplicate: false });
  } catch (error) {
    console.error("Paddle webhook processing failed", eventId, error?.message || "unknown");
    return json(res, 500, { error: "webhook_processing_failed" });
  }
}
