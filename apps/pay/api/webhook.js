import crypto from "node:crypto";

import { billingSql, ensureBillingSchema } from "./_db.js";
import { entitlementMutationFromPaddleEvent } from "./_entitlement.js";
import { verifyPaddleSignature } from "./_security.js";

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

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const raw = await rawBody(req);
  const verification = verifyPaddleSignature({
    rawBody: raw,
    header: req.headers["paddle-signature"],
  });
  if (!verification.ok) {
    const status =
      verification.reason === "webhook_secret_not_configured" ? 503 :
      verification.reason === "stale_signature" ? 408 : 401;
    return json(res, status, { error: verification.reason });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json(res, 400, { error: "invalid_json" });
  }

  const eventId = String(event?.event_id || "").trim();
  const eventType = String(event?.event_type || "").trim();
  if (!eventId || !eventType) {
    return json(res, 400, { error: "malformed_event" });
  }

  try {
    await ensureBillingSchema();
    const sql = billingSql();
    const payloadHash = crypto.createHash("sha256").update(raw, "utf8").digest("hex");

    const claimed = await sql`
      INSERT INTO instant_pay_events (event_id, event_type, payload_hash)
      VALUES (${eventId}, ${eventType}, ${payloadHash})
      ON CONFLICT (event_id) DO NOTHING
      RETURNING event_id
    `;

    if (claimed.length === 0) {
      const existing = await sql`
        SELECT processed_at
        FROM instant_pay_events
        WHERE event_id = ${eventId}
        LIMIT 1
      `;
      if (existing[0]?.processed_at) {
        return json(res, 200, { received: true, duplicate: true });
      }
    }

    const mutation = entitlementMutationFromPaddleEvent(event);
    if (mutation) {
      await sql`
        INSERT INTO instant_pay_entitlements (
          subject_id,
          entitlement_key,
          active,
          status,
          provider,
          product_key,
          plan_key,
          external_transaction_id,
          external_subscription_id,
          expires_at,
          updated_at
        )
        VALUES (
          ${mutation.subjectId},
          ${mutation.entitlementKey},
          ${mutation.active},
          ${mutation.status},
          ${mutation.provider},
          ${mutation.productKey},
          ${mutation.planKey},
          ${mutation.externalTransactionId},
          ${mutation.externalSubscriptionId},
          ${mutation.expiresAt},
          now()
        )
        ON CONFLICT (subject_id, entitlement_key) DO UPDATE SET
          active = EXCLUDED.active,
          status = EXCLUDED.status,
          provider = EXCLUDED.provider,
          product_key = COALESCE(EXCLUDED.product_key, instant_pay_entitlements.product_key),
          plan_key = COALESCE(EXCLUDED.plan_key, instant_pay_entitlements.plan_key),
          external_transaction_id = COALESCE(EXCLUDED.external_transaction_id, instant_pay_entitlements.external_transaction_id),
          external_subscription_id = COALESCE(EXCLUDED.external_subscription_id, instant_pay_entitlements.external_subscription_id),
          expires_at = COALESCE(EXCLUDED.expires_at, instant_pay_entitlements.expires_at),
          updated_at = now()
      `;
    }

    await sql`
      UPDATE instant_pay_events
      SET processed_at = now(), last_error = NULL
      WHERE event_id = ${eventId}
    `;

    return json(res, 200, {
      received: true,
      duplicate: false,
      entitlement_updated: Boolean(mutation),
    });
  } catch (error) {
    try {
      const sql = billingSql();
      await sql`
        UPDATE instant_pay_events
        SET last_error = ${String(error?.message || error).slice(0, 1000)}
        WHERE event_id = ${eventId}
      `;
    } catch {
      // Preserve the original failure.
    }
    console.error("InstantPay webhook processing failed", eventId, error);
    return json(res, 500, { error: "webhook_processing_failed" });
  }
}
