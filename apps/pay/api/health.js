export default function handler(_req, res) {
  const paddle = Boolean(
    process.env.PADDLE_API_KEY &&
    process.env.PADDLE_HOSTED_CHECKOUT_URL
  );
  const adapty = Boolean(
    process.env.ADAPTY_PUBLIC_API_KEY &&
    process.env.ADAPTY_PLACEMENT_ID
  );
  const webhook = Boolean(process.env.PADDLE_WEBHOOK_SECRET);

  res.setHeader("cache-control", "no-store");
  res.status(paddle ? 200 : 503).json({
    ok: paddle,
    service: "instant-pay",
    provider: "paddle",
    pricing: adapty ? "adapty" : "catalog",
    webhookVerified: webhook,
    entitlementSyncConfigured: Boolean(
      process.env.INSTANTSTUDY_ENTITLEMENT_SYNC_URL &&
      process.env.INSTANTSTUDY_ENTITLEMENT_SYNC_TOKEN
    ),
  });
}
