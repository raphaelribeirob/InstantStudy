import { createHmac, timingSafeEqual } from "node:crypto";

const OFFERS = new Set(["instant_speak_pro_monthly", "instant_speak_pro_annual"]);
function secret() {
  const key = String(process.env.INSTANT_PAY_BRIDGE_SECRET || "");
  if (Buffer.byteLength(key, "utf8") < 32) throw new Error("bridge_not_configured");
  return key;
}
function signature(message) {
  return createHmac("sha256", secret()).update(message).digest("hex");
}
function equalHex(a, b) {
  if (!/^[a-f0-9]{64}$/.test(String(a))) return false;
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}
export function verifySpeakCheckoutIntent(token, offer, now = Date.now()) {
  if (typeof token !== "string" || token.length > 1600) return null;
  const [encoded, mac, extra] = token.split(".");
  if (!encoded || !mac || extra || !equalHex(mac, signature(encoded))) return null;
  let claim;
  try { claim = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); }
  catch { return null; }
  if (claim?.v !== 1 || claim?.source !== "instant_speak" ||
      claim?.offer !== offer || !OFFERS.has(offer) ||
      !/^neon:[a-zA-Z0-9_-]{8,128}$/.test(String(claim?.uid || "")) ||
      typeof claim?.nonce !== "string" || !/^[0-9a-f-]{36}$/.test(claim.nonce) ||
      !Number.isSafeInteger(claim?.iat) || !Number.isSafeInteger(claim?.exp) ||
      claim.exp <= now || claim.iat > now + 30000 || claim.exp - claim.iat > 300000) return null;
  return claim;
}
export function trustedSpeakCustomData(data = {}) {
  return data?.product_key === "instant_speak" &&
    data?.source_app === "instant_speak" &&
    data?.subject_verified === "instant_speak_bridge_v1" &&
    /^neon:[a-zA-Z0-9_-]{8,128}$/.test(String(data?.user_ref || "")) &&
    OFFERS.has(String(data?.offer_key || ""));
}
export async function notifyInstantSpeak(event, { fetchImpl = fetch, now = Date.now() } = {}) {
  const data = event?.data || {};
  if (!trustedSpeakCustomData(data.custom_data)) return { delivered: false, skipped: true };
  const url = new URL(String(process.env.INSTANT_SPEAK_BILLING_WEBHOOK_URL || ""));
  if (url.protocol !== "https:") throw new Error("billing_callback_invalid");
  const payload = JSON.stringify({
    event_id: event.event_id, event_type: event.event_type,
    occurred_at: event.occurred_at, data: {
      id: data.id, status: data.status, subscription_id: data.subscription_id,
      current_billing_period: data.current_billing_period,
      next_billed_at: data.next_billed_at, custom_data: data.custom_data
    }
  });
  const stamp = Math.floor(now / 1000).toString();
  const envelope = Buffer.from(payload, "utf8").toString("base64url");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetchImpl(url.toString(), {
      method: "POST", headers: {
        "content-type": "application/json",
        "x-instant-pay-timestamp": stamp,
        "x-instant-pay-signature": signature(stamp + ":" + envelope)
      }, body: JSON.stringify({ payload: envelope }), signal: controller.signal
    });
    if (!response.ok) throw new Error("billing_callback_failed");
    return { delivered: true };
  } finally { clearTimeout(timeout); }
}
