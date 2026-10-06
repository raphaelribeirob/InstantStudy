import { resolveOffer } from "./_catalog.js";
import { paddleApiBase } from "./_paddle.js";

const MAX_CHECKOUT_BODY_BYTES = 16 * 1024;

function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  return res.end(JSON.stringify(body));
}

function cleanSource(value) {
  const source = String(value || "").toLowerCase();
  return /^[a-z0-9_-]{1,48}$/.test(source) ? source : "direct";
}

function cleanLocale(value) {
  const locale = String(value || "").slice(0, 16);
  return /^[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?$/.test(locale) ? locale : "en";
}

function requestBodyTooLarge(req, body) {
  const declared = Number(req.headers["content-length"] || 0);
  if (Number.isFinite(declared) && declared > MAX_CHECKOUT_BODY_BYTES) return true;

  try {
    return Buffer.byteLength(JSON.stringify(body || {}), "utf8") > MAX_CHECKOUT_BODY_BYTES;
  } catch {
    return true;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    return json(res, 415, { error: "content_type_not_supported" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (requestBodyTooLarge(req, body)) {
    return json(res, 413, { error: "request_too_large" });
  }

  const apiKey = String(process.env.PADDLE_API_KEY || "").trim();
  const hostedCheckout = String(process.env.PADDLE_HOSTED_CHECKOUT_URL || "").trim();
  if (!apiKey || !hostedCheckout) {
    return json(res, 503, { error: "billing_not_configured" });
  }

  let hosted;
  try {
    hosted = new URL(hostedCheckout);
  } catch {
    return json(res, 503, { error: "hosted_checkout_invalid" });
  }
  if (hosted.protocol !== "https:") {
    return json(res, 503, { error: "hosted_checkout_invalid" });
  }

  const offer = resolveOffer(body.offer);
  if (!offer) return json(res, 400, { error: "offer_unavailable" });

  const source = cleanSource(body.source);
  const locale = cleanLocale(body.locale);

  if (source !== "direct" && source !== offer.product) {
    return json(res, 400, { error: "source_offer_mismatch" });
  }

  const response = await fetch(`${paddleApiBase()}/transactions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "paddle-version": "1",
    },
    body: JSON.stringify({
      items: [{ price_id: offer.priceId, quantity: 1 }],
      collection_mode: "automatic",
      custom_data: {
        funnel: "instant_unified_v2",
        offer_key: offer.key,
        product_key: offer.product,
        entitlement_key: offer.entitlement,
        plan_key: offer.plan,
        billing_cadence: offer.cadence,
        source_app: source,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.data?.id) {
    console.error("Paddle transaction creation failed", response.status, payload?.error?.code || "unknown");
    return json(res, 502, { error: "provider_unavailable" });
  }

  hosted.searchParams.set("transaction_id", String(payload.data.id));
  hosted.searchParams.set("locale", locale);
  hosted.searchParams.set("variant", "express");
  hosted.searchParams.set("theme", "light");

  return json(res, 200, {
    checkout_url: hosted.toString(),
    transaction_id: String(payload.data.id),
  });
}
