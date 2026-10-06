import crypto from "node:crypto";
import { signInstantCloserCallback } from "./_handoff.js";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function safeEqualHex(left, right) {
  try {
    const a = Buffer.from(String(left || ""), "hex");
    const b = Buffer.from(String(right || ""), "hex");
    return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function verifyPaddleSignature(rawBody, header) {
  const secret = String(process.env.PADDLE_WEBHOOK_SECRET || "").trim();
  if (!secret) throw new Error("paddle_webhook_secret_missing");

  const parts = {};
  for (const chunk of String(header || "").split(";")) {
    const [key, value] = chunk.split("=", 2);
    if (!key || !value) continue;
    (parts[key.trim()] ||= []).push(value.trim());
  }

  const timestamp = Number(parts.ts?.[0]);
  const signatures = parts.h1 || [];
  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new Error("paddle_signature_invalid");
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 30) {
    throw new Error("paddle_signature_stale");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(\`\${timestamp}:\`, "utf8")
    .update(rawBody, "utf8")
    .digest("hex");

  if (!signatures.some((signature) => safeEqualHex(signature, expected))) {
    throw new Error("paddle_signature_invalid");
  }
}

function entitlementState(event) {
  const eventType = String(event?.event_type || "");
  const data = event?.data && typeof event.data === "object" ? event.data : {};
  const status = String(data.status || "").toLowerCase();

  if (eventType === "transaction.completed") {
    return { active: true, status: "completed" };
  }
  if (eventType.startsWith("subscription.")) {
    return {
      active: status === "active" || status === "trialing",
      status: status || eventType.split(".").pop() || "unknown",
    };
  }
  return null;
}

async function notifyInstantCloser(event, customData, state) {
  const callbackUrl = String(
    process.env.INSTANT_CLOSER_ENTITLEMENT_WEBHOOK_URL || "",
  ).trim();
  if (!callbackUrl) throw new Error("instant_closer_callback_url_missing");

  const companyId = String(customData.instant_company_id || "");
  if (!/^[1-9]\d{0,18}$/.test(companyId)) {
    throw new Error("instant_closer_company_invalid");
  }

  const data = event?.data && typeof event.data === "object" ? event.data : {};
  const nextBilledAt =
    data.next_billed_at ||
    data.current_billing_period?.ends_at ||
    data.billing_period?.ends_at ||
    null;

  const payload = {
    event_id: String(event.event_id || event.notification_id || ""),
    company_id: Number(companyId),
    event_type: String(event.event_type || ""),
    product_key: String(customData.product_key || ""),
    offer_key: String(customData.offer_key || ""),
    status: state.status,
    active: state.active,
    paddle_entity_id: String(data.id || ""),
    expires_at: nextBilledAt,
    occurred_at: String(event.occurred_at || new Date().toISOString()),
  };

  if (!payload.event_id) throw new Error("paddle_event_id_missing");

  const raw = JSON.stringify(payload);
  const signature = signInstantCloserCallback(raw);
  const response = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-instant-pay-signature": signature,
    },
    body: raw,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      \`instant_closer_callback_failed_\${response.status}_\${body.slice(0, 120)}\`,
    );
  }
}

export async function POST(request) {
  const rawBody = await request.text();
  try {
    verifyPaddleSignature(rawBody, request.headers.get("paddle-signature"));
  } catch (error) {
    console.warn(
      "Paddle webhook rejected",
      error instanceof Error ? error.message : "unknown",
    );
    return json(401, { error: "invalid_signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const customData =
    event?.data?.custom_data && typeof event.data.custom_data === "object"
      ? event.data.custom_data
      : {};
  const isInstantCloser =
    String(customData.source_app || "") === "instant_closer" &&
    String(customData.instant_handoff_verified || "") === "true";

  if (!isInstantCloser) {
    return json(200, { received: true, routed: false });
  }

  const state = entitlementState(event);
  if (!state) {
    return json(200, { received: true, routed: false });
  }

  try {
    await notifyInstantCloser(event, customData, state);
  } catch (error) {
    console.error(
      "InstantCloser entitlement callback failed",
      error instanceof Error ? error.message : "unknown",
    );
    return json(502, { error: "entitlement_callback_failed" });
  }

  return json(200, { received: true, routed: true });
}
