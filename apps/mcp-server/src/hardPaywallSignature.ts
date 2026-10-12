import { createHmac, timingSafeEqual } from "node:crypto";

export function hardPaywallServiceEnabled() {
  return process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED === "true";
}

/**
 * A short-lived proof that a trusted BFF previously verified a paid learner.
 * Service-to-service bearer alone is NOT sufficient in hard-paywall mode.
 */
export function isSignedBffRequest(input: {
  method: string;
  path: string;
  body: unknown;
  timestamp?: string;
  signature?: string;
}, now = Date.now()) {
  const secret = process.env.INSTANTSTUDY_BFF_SIGNING_SECRET ?? "";
  if (secret.length < 32) return false;
  const stamp = input.timestamp ?? "";
  if (!/^\d{13}$/.test(stamp)) return false;
  const issuedAt = Number(stamp);
  if (!Number.isFinite(issuedAt) || Math.abs(now - issuedAt) > 30_000) return false;
  const supplied = input.signature ?? "";
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;
  const bodyText = input.method.toUpperCase() === "GET" ? "" : JSON.stringify(input.body ?? {});
  const mac = createHmac("sha256", secret)
    .update(`${stamp}\n${input.method.toUpperCase()}\n${input.path}\n${bodyText}`)
    .digest("hex");
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(mac, "hex"));
}
