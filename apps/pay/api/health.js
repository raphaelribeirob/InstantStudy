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
  const selfService = Boolean(process.env.PADDLE_CUSTOMER_PORTAL_URL);
  const ok = paddle && webhook && selfService;

  res.setHeader("cache-control", "no-store");
  res.status(ok ? 200 : 503).json({
    ok,
    service: "instant-pay",
    provider: "paddle",
    pricing: adapty ? "adapty" : "catalog",
    webhookVerified: webhook,
    selfServiceConfigured: selfService,
    entitlementSyncConfigured: Boolean(
      process.env.INSTANTSTUDY_ENTITLEMENT_SYNC_URL &&
      process.env.INSTANTSTUDY_ENTITLEMENT_SYNC_TOKEN
    ),
  });
}
