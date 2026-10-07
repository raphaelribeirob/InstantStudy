import { billingDbConfigured } from "./_db.js";
import { serverKeyConfigured } from "./_security.js";

export default function handler(_req, res) {
  const checks = {
    paddle_api: Boolean(process.env.PADDLE_API_KEY),
    hosted_checkout: Boolean(process.env.PADDLE_HOSTED_CHECKOUT_URL),
    paddle_webhook: Boolean(process.env.PADDLE_WEBHOOK_SECRET),
    server_auth: serverKeyConfigured(),
    entitlement_database: billingDbConfigured(),
  };
  const configured = Object.values(checks).every(Boolean);
  res.setHeader("cache-control", "no-store");
  res.status(configured ? 200 : 503).json({
    ok: configured,
    service: "instant-pay",
    provider: "paddle",
    entitlement_provider: "instant_pay",
    checks,
  });
}
