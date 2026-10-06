import { databaseConfigured, databaseHealthy } from "./_db.js";

export default async function handler(_req, res) {
  const paddleCheckout = Boolean(
    process.env.PADDLE_API_KEY &&
    process.env.PADDLE_HOSTED_CHECKOUT_URL
  );
  const webhook = Boolean(process.env.PADDLE_WEBHOOK_SECRET);
  const identity = Boolean(process.env.INSTANT_ACCOUNT_INTROSPECTION_URL);
  const database = databaseConfigured();

  let databaseReachable = false;
  if (database) {
    try {
      databaseReachable = await databaseHealthy();
    } catch {
      databaseReachable = false;
    }
  }

  const fulfillment = webhook && database && databaseReachable;
  const access = fulfillment && identity;
  const ok = paddleCheckout && fulfillment;

  res.setHeader("cache-control", "no-store");
  res.status(ok ? 200 : 503).json({
    ok,
    service: "instant-pay",
    provider: "paddle",
    checkout_ready: paddleCheckout,
    webhook_ready: webhook,
    database_ready: databaseReachable,
    entitlement_api_ready: access,
  });
}
