import { createHmac } from "node:crypto";

/**
 * Authoritative Web/PWA paid-access policy.
 * OFF until account sign-in + Paddle offer provisioning have been proven E2E.
 * Never trust the browser's user ID or plan without the Instant Pay introspection.
 */
export function hardPaywallEnabled() {
  return process.env.INSTANTSTUDY_HARD_PAYWALL_ENABLED === "true";
}

function signingSecret() {
  const secret = String(process.env.INSTANTSTUDY_BFF_SIGNING_SECRET || "");
  return secret.length >= 32 ? secret : "";
}

export function signedUpstreamHeaders(method, path, bodyText = "") {
  if (!hardPaywallEnabled()) return {};
  const secret = signingSecret();
  if (!secret) throw new Error("hard_paywall_signing_not_configured");
  const timestamp = Date.now().toString();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}\n${method.toUpperCase()}\n${path}\n${bodyText}`)
    .digest("hex");
  return {
    "x-instantstudy-timestamp": timestamp,
    "x-instantstudy-signature": signature,
  };
}

const PAID_ENTITLEMENTS = new Set([
  "instant_study.plus",
  "instant_study.unlimited",
  "instant_study.family",
  "instant_study.family_member",
  "instant_one.all",
]);

function validIdentity(value) {
  const str = typeof value === "string" ? value.trim() : "";
  if (!str || str.length > 200 || /^(web|flutter)-/i.test(str)) return "";
  return str;
}

export async function resolveHardPaywallAccess(body, fetchImpl = fetch) {
  if (!hardPaywallEnabled()) {
    return { enabled: false, authorized: true, status: 200, plan: null };
  }
  if (!signingSecret()) {
    return { enabled: true, authorized: false, status: 503, reason: "hard_paywall_signing_not_configured" };
  }

  const id = validIdentity(body?.learnerId);
  const accountId = validIdentity(body?.accountUserId);
  const token = typeof body?.accountAccessToken === "string"
    ? body.accountAccessToken.trim() : "";
  if (!id || id !== accountId || token.length < 10 || token.length > 4000) {
    return { enabled: true, authorized: false, status: 401, reason: "account_required" };
  }

  const base = String(
    process.env.INSTANT_PAY_URL || "https://instant-pay-gamma.vercel.app",
  ).trim().replace(/\/$/, "");
  // Only a trusted, operator-configured HTTPS endpoint may receive account bearer tokens.
  if (!base.startsWith("https://")) {
    return { enabled: true, authorized: false, status: 503, reason: "billing_not_configured" };
  }

  try {
    const url = `${base}/v1/billing/entitlements?user_id=${encodeURIComponent(id)}`;
    const response = await fetchImpl(url, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401 || response.status === 403) {
      return { enabled: true, authorized: false, status: 401, reason: "account_required" };
    }
    if (!response.ok) {
      return { enabled: true, authorized: false, status: 503, reason: "billing_unavailable" };
    }
    const data = await response.json();
    if (!data || !Array.isArray(data.entitlements)) {
      return { enabled: true, authorized: false, status: 503, reason: "billing_response_invalid" };
    }
    const active = data.entitlements.filter(item =>
      item && item.active === true && PAID_ENTITLEMENTS.has(String(item.key || "")),
    );
    const unlimited = active.some(item =>
      ["instant_study.unlimited", "instant_study.family",
       "instant_study.family_member", "instant_one.all"].includes(item.key),
    );
    return {
      enabled: true,
      authorized: active.length > 0,
      status: active.length ? 200 : 402,
      plan: active.length ? (unlimited ? "unlimited" : "plus") : null,
      reason: active.length ? null : "subscription_required",
    };
  } catch {
    return { enabled: true, authorized: false, status: 503, reason: "billing_unavailable" };
  }
}
