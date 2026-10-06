function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.end(JSON.stringify(body));
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "method_not_allowed" });
  }

  const raw = String(process.env.PADDLE_CUSTOMER_PORTAL_URL || "").trim();
  if (!raw) {
    return json(res, 503, { error: "self_service_not_configured" });
  }

  let portal;
  try {
    portal = new URL(raw);
  } catch {
    return json(res, 503, { error: "self_service_not_configured" });
  }

  if (portal.protocol !== "https:" || portal.username || portal.password) {
    return json(res, 503, { error: "self_service_not_configured" });
  }

  res.status(302);
  res.setHeader("cache-control", "no-store");
  res.setHeader("location", portal.toString());
  return res.end();
}
