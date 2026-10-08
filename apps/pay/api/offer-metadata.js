import { resolveOffer } from "./_catalog.js";
import { paddleApiBase } from "./_paddle.js";
import { timingSafeEqual } from "node:crypto";

function response(res, status, value) {
  res.setHeader("cache-control", "no-store");
  res.setHeader("content-type", "application/json; charset=utf-8");
  return res.status(status).end(JSON.stringify(value));
}
function authorized(req) {
  const configured = String(process.env.INSTANT_PAY_METADATA_TOKEN || "");
  const provided = String(req.headers?.authorization || "").replace(/^Bearer /, "");
  if (configured.length < 32) return false;
  const a = Buffer.from(configured), b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}
export default async function handler(req, res) {
  if (req.method !== "GET") return response(res, 405, { error: "method_not_allowed" });
  if (!authorized(req)) return response(res, 401, { error: "unauthorized" });
  const offer = resolveOffer(String(req.query?.offer || ""));
  if (!offer || offer.product !== "instant_speak" ||
      req.query?.source !== "instant_speak") {
    return response(res, 400, { error: "offer_unavailable" });
  }
  const country = String(req.query?.country || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return response(res, 400, { error: "country_required" });
  }
  const key = String(process.env.PADDLE_API_KEY || "");
  if (!key) return response(res, 503, { error: "pricing_unavailable" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const upstream = await fetch(paddleApiBase() + "/pricing-preview", {
      method: "POST",
      headers: { authorization: "Bearer " + key, "content-type": "application/json", "paddle-version": "1" },
      body: JSON.stringify({ items: [{ price_id: offer.priceId, quantity: 1 }], address: { country_code: country } }),
      signal: controller.signal
    });
    const data = (await upstream.json().catch(() => ({}))).data;
    const line = data?.details?.line_items?.[0];
    const amount = String(line?.formatted_totals?.total || "").trim();
    const cycle = line?.price?.billing_cycle?.interval;
    // Never advertise an unverified trial or a fake price.
    if (!upstream.ok || !amount || line?.price?.id !== offer.priceId ||
        (cycle !== "month" && cycle !== "year") || line?.price?.trial_period) {
      return response(res, 503, { error: "pricing_unavailable" });
    }
    return response(res, 200, {
      verified: true, offer: offer.key, localizedPrice: amount,
      currency: data?.currency_code || "", country, trialEligible: false,
      trialLabel: "",
      renewalLabel: "Renews " + (cycle === "month" ? "monthly" : "annually") +
        " at the price shown at checkout. Estimated " + country + " total: " + amount + "."
    });
  } catch {
    return response(res, 503, { error: "pricing_unavailable" });
  } finally {
    clearTimeout(timer);
  }
}
