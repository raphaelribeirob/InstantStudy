export default function handler(_req, res) {
  const configured = Boolean(
    process.env.PADDLE_API_KEY &&
    process.env.PADDLE_HOSTED_CHECKOUT_URL
  );
  res.setHeader("cache-control", "no-store");
  res.status(configured ? 200 : 503).json({
    ok: configured,
    service: "instant-pay",
    provider: "paddle",
  });
}
