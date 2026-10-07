function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  return res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    return json(res, 405, { error: "method_not_allowed" });
  }

  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Bearer ")) {
    return json(res, 401, { error: "unauthorized" });
  }

  const payBase = String(
    process.env.INSTANT_PAY_URL ||
      process.env.VITE_INSTANT_PAY_URL ||
      "https://instant-pay-gamma.vercel.app",
  ).replace(/\/$/, "");

  const response = await fetch(`${payBase}/v1/billing/family`, {
    method: req.method,
    headers: {
      authorization: auth,
      accept: "application/json",
      ...(req.method === "GET" ? {} : { "content-type": "application/json" }),
    },
    body:
      req.method === "GET"
        ? undefined
        : JSON.stringify(req.body && typeof req.body === "object" ? req.body : {}),
    signal: AbortSignal.timeout(15_000),
  });

  const data = await response.json().catch(() => ({}));
  return json(res, response.status, data);
}
