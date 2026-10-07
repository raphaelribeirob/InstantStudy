const MAX_BODY_BYTES = 8 * 1024;

function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  return res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "method_not_allowed" });
  }

  const declared = Number(req.headers["content-length"] || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return json(res, 413, { error: "body_too_large" });
  }

  const base = String(process.env.INSTANTSTUDY_API_URL || "")
    .trim()
    .replace(/\/$/, "");
  const apiKey = String(process.env.INSTANTSTUDY_API_KEY || "").trim();

  if (!base || !apiKey) {
    return json(res, 503, { error: "offer_api_not_configured" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const customerId =
    typeof body.customerId === "string" ? body.customerId.trim().slice(0, 200) : "";
  const locale =
    typeof body.locale === "string" && /^[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?$/.test(body.locale)
      ? body.locale
      : "en";

  if (!customerId) {
    return json(res, 400, { error: "customer_id_required" });
  }

  try {
    const response = await fetch(`${base}/api/v1/offer`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ customerId, locale }),
      signal: AbortSignal.timeout(10_000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json(res, response.status, {
        error: payload?.error || "offer_api_error",
      });
    }

    return json(res, 200, payload);
  } catch {
    return json(res, 502, { error: "offer_api_unavailable" });
  }
}
