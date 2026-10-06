import { createHmac, timingSafeEqual } from "node:crypto";

export const config = {
  api: {
    bodyParser: false,
  },
};

function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.end(JSON.stringify(body));
}

async function readRawBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > 1024 * 1024) throw new Error("webhook_body_too_large");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function signatures(header) {
  const values = { ts: "", h1: [] };
  for (const part of String(header || "").split(";")) {
    const [key, value] = part.split("=", 2);
    if (key === "ts" && value) values.ts = value;
    if (key === "h1" && value) values.h1.push(value);
  }
  return values;
}

function safeHexEqual(expected, supplied) {
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(supplied, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifyPaddle(raw, header, secret) {
  const parsed = signatures(header);
  const timestamp = Number.parseInt(parsed.ts, 10);
  if (!Number.isFinite(timestamp) || !parsed.h1.length) return false;

  const tolerance = Number.parseInt(
    process.env.PADDLE_WEBHOOK_TOLERANCE_SECONDS || "300",
    10,
  );
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > tolerance) return false;

  const signed = `${parsed.ts}:${raw.toString("utf8")}`;
  const expected = createHmac("sha256", secret).update(signed).digest("hex");
  return parsed.h1.some((signature) => safeHexEqual(expected, signature));
}

function entitlementPlan(event) {
  const custom = event?.data?.custom_data;
  if (!custom || custom.product_key !== "instant_study") return null;

  if (event.event_type === "subscription.canceled") {
    return { learnerId: custom.entitlement_subject_id, plan: "free" };
  }

  if (
    event.event_type === "transaction.completed" ||
    event.event_type === "subscription.activated" ||
    event.event_type === "subscription.resumed"
  ) {
    const plan =
      custom.plan_key === "unlimited"
        ? "unlimited"
        : custom.plan_key === "plus"
          ? "plus"
          : null;
    return plan
      ? { learnerId: custom.entitlement_subject_id, plan }
      : null;
  }

  return null;
}

async function syncEntitlement(change) {
  if (!change?.learnerId) return { skipped: true };

  const url = String(process.env.INSTANTSTUDY_ENTITLEMENT_SYNC_URL || "").trim();
  const token = String(process.env.INSTANTSTUDY_ENTITLEMENT_SYNC_TOKEN || "").trim();
  if (!url || !token) return { skipped: true };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(change),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`entitlement_sync_failed_${response.status}`);
  }
  return { skipped: false };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "method_not_allowed" });
  }

  const secret = String(process.env.PADDLE_WEBHOOK_SECRET || "").trim();
  if (!secret) return json(res, 503, { error: "webhook_not_configured" });

  let raw;
  try {
    raw = await readRawBody(req);
  } catch {
    return json(res, 413, { error: "invalid_webhook_body" });
  }

  const signature = req.headers["paddle-signature"];
  if (!verifyPaddle(raw, signature, secret)) {
    return json(res, 401, { error: "invalid_signature" });
  }

  let event;
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    return json(res, 400, { error: "invalid_json" });
  }

  try {
    await syncEntitlement(entitlementPlan(event));
  } catch (error) {
    console.error(
      "Instant entitlement sync failed",
      error instanceof Error ? error.message : "unknown",
    );
    return json(res, 502, { error: "entitlement_sync_failed" });
  }

  return json(res, 200, {
    received: true,
    event_id: event?.event_id || null,
    event_type: event?.event_type || null,
  });
}
