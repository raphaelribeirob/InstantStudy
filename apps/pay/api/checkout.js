import { resolveOffer } from "./_catalog.js";
import { resolveAdaptyContext } from "./_adapty.js";

const LIVE_API = "https://api.paddle.com";
const SANDBOX_API = "https://sandbox-api.paddle.com";

function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
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

function cleanCustomerId(value) {
  const customerId = String(value || "").trim();
  return /^[a-zA-Z0-9._:-]{8,128}$/.test(customerId) ? customerId : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const apiKey = String(process.env.PADDLE_API_KEY || "").trim();
  const hostedCheckout = String(process.env.PADDLE_HOSTED_CHECKOUT_URL || "").trim();
  const customerPortal = String(process.env.PADDLE_CUSTOMER_PORTAL_URL || "").trim();
  const webhookSecret = String(process.env.PADDLE_WEBHOOK_SECRET || "").trim();
  const environment = String(process.env.PADDLE_ENV || "sandbox").toLowerCase();

  if (!apiKey || !hostedCheckout || !customerPortal || !webhookSecret) {
    return json(res, 503, { error: "billing_not_configured" });
  }

  try {
    const portal = new URL(customerPortal);
    if (portal.protocol !== "https:") {
      return json(res, 503, { error: "self_service_not_configured" });
    }
  } catch {
    return json(res, 503, { error: "self_service_not_configured" });
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

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const requestedOffer = resolveOffer(body.offer);
  if (!requestedOffer) return json(res, 400, { error: "offer_unavailable" });

  const source = cleanSource(body.source);
  const locale = cleanLocale(body.locale);
  const customerId = cleanCustomerId(body.customerId);

  const adapty = await resolveAdaptyContext({
    customerId,
    locale,
    requestedOffer: requestedOffer.key,
  });
  const candidateOffer = resolveOffer(adapty.offerKey);
  const offer =
    candidateOffer && candidateOffer.product === requestedOffer.product
      ? candidateOffer
      : requestedOffer;

  if (source !== "direct" && source !== offer.product) {
    return json(res, 400, { error: "source_offer_mismatch" });
  }

  const apiBase = environment === "live" ? LIVE_API : SANDBOX_API;

  const response = await fetch(`${apiBase}/transactions`, {
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
        funnel: "instant_unified_v1",
        offer_key: offer.key,
        product_key: offer.product,
        plan_key: offer.plan,
        billing_cadence: offer.cadence,
        source_app: source,
        pricing_provider: adapty.provider,
        adapty_variation_id: adapty.variationId || null,
        adapty_paywall_id: adapty.paywallId || null,
        adapty_placement_id: adapty.placementId || null,
        analytics_customer_id: customerId || null,
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
    offer_key: offer.key,
    pricing_provider: adapty.provider,
    variation_id: adapty.variationId || null,
  });
}
