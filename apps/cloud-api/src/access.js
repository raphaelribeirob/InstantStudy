/**
 * Pure InstantPay entitlement projection.
 *
 * IMPORTANT: This helper does not verify payments or authorize app access.
 * Only call it on server-verified entitlements for an identity proven to
 * belong to the requesting Auth0 account. Nothing in the Cloud API currently
 * invokes this helper or creates a paid-access endpoint.
 */
const perProduct = Object.freeze({
  instant_speak: ["instant_speak.pro"],
  instant_study: ["instant_study.plus", "instant_study.unlimited", "instant_study.family", "instant_study.family_member"],
  instant_bible: ["instant_bible.pro"],
});
const bundleKey = "instant_one.all";

function isActive(row, now) {
  if (row?.active !== true || typeof row.key !== "string") return false;
  const expiresAt = row.expires_at ?? row.expiresAt;
  if (!expiresAt) return true;
  const until = new Date(expiresAt).getTime();
  return Number.isFinite(until) && until > now;
}

export function projectInstantAccess(verifiedEntitlements, now = Date.now()) {
  if (!Array.isArray(verifiedEntitlements)) throw new Error("verified_entitlements_required");
  const active = verifiedEntitlements.filter(row => isActive(row, now));
  const keys = new Set(active.map(row => row.key));
  const bundle = keys.has(bundleKey);
  return Object.fromEntries(Object.entries(perProduct).map(([product, grants]) => [
    product,
    {
      active: bundle || grants.some(key => keys.has(key)),
      source: bundle ? "instant_pass" : grants.find(key => keys.has(key)) ?? null,
    },
  ]));
}
