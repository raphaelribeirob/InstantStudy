import { offerDefinition } from "./_catalog.js";
import {
  cleanCustomerUserId,
  cleanLocale,
  getAdaptyPaywall,
} from "./_adapty.js";
import { enforceApiRequest } from "./_security.js";

function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "method_not_allowed" });
  }
  if (!enforceApiRequest(req, res, json)) return;

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const baseOffer = offerDefinition(body.offer);
  if (!baseOffer) {
    return json(res, 400, { error: "offer_unavailable" });
  }

  const customerUserId = cleanCustomerUserId(body.customer_user_id);
  if (!customerUserId) {
    return json(res, 400, { error: "customer_id_invalid" });
  }

  try {
    const adapty = await getAdaptyPaywall({
      baseOfferKey: baseOffer.key,
      customerUserId,
      locale: cleanLocale(body.locale),
    });

    if (!adapty) {
      return json(res, 200, {
        provider: "catalog",
        adapty_enabled: false,
        offer_key: baseOffer.key,
      });
    }

    return json(res, 200, { adapty_enabled: true, ...adapty });
  } catch (error) {
    console.error(
      "Adapty paywall resolution failed",
      error instanceof Error ? error.message : "unknown",
    );
    return json(res, 200, {
      provider: "catalog",
      adapty_enabled: false,
      offer_key: baseOffer.key,
      fallback_reason: "adapty_unavailable",
    });
  }
}
