import { entitlementsForIdentity, familyAccessForIdentity } from "./_db.js";

function json(res, status, body) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.status(status);
  return res.end(JSON.stringify(body));
}

async function identityFromBearer(req) {
  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Bearer ")) return null;

  const introspectionUrl = String(process.env.INSTANT_ACCOUNT_INTROSPECTION_URL || "").trim();
  if (!introspectionUrl) throw new Error("identity_not_configured");

  const response = await fetch(introspectionUrl, {
    method: "GET",
    headers: {
      authorization: auth,
      accept: "application/json",
    },
  });
  if (!response.ok) return null;

  const body = await response.json().catch(() => ({}));
  const userRef = String(body.user_id || body.sub || body.id || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!userRef && !email) return null;
  return { userRef: userRef || null, email: email || null };
}

function expanded(rows, familyAccess = null) {
  const output = rows.map((row) => ({
    key: row.entitlement_key,
    active: Boolean(row.active),
    provider: "paddle",
    expires_at: row.expires_at || null,
    status: row.status,
  }));

  if (output.some((item) => item.key === "instant_study.family" && item.active)) {
    output.push({
      key: "instant_study.unlimited",
      active: true,
      provider: "instant_study_family",
      expires_at: null,
      status: "family_owner",
    });
  }

  if (familyAccess) {
    output.push({
      key: "instant_study.family_member",
      active: true,
      provider: "instant_study_family",
      expires_at: null,
      status: "family_member",
    });
    output.push({
      key: "instant_study.unlimited",
      active: true,
      provider: "instant_study_family",
      expires_at: null,
      status: "family_member",
    });
  }

  if (output.some((item) => item.key === "instant_one.all" && item.active)) {
    const bundle = [
      "instant_speak.pro",
      "instant_study.plus",
      "instant_study.unlimited",
      "instant_bible.pro",
      "instant_vest.pro",
      "dotspeak.premium",
    ];
    for (const key of bundle) {
      if (!output.some((item) => item.key === key && item.active)) {
        output.push({
          key,
          active: true,
          provider: "instant_one",
          expires_at: null,
          status: "bundle",
        });
      }
    }
  }
  return output;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "method_not_allowed" });

  try {
    const identity = await identityFromBearer(req);
    if (!identity) return json(res, 401, { error: "unauthorized" });

    const requestedUser = String(req.query?.user_id || "").trim();
    if (requestedUser && identity.userRef && requestedUser !== identity.userRef) {
      return json(res, 403, { error: "identity_mismatch" });
    }

    const [rows, familyAccess] = await Promise.all([
      entitlementsForIdentity(identity),
      familyAccessForIdentity(identity),
    ]);
    return json(res, 200, { entitlements: expanded(rows, familyAccess) });
  } catch (error) {
    if (error?.message === "identity_not_configured") {
      return json(res, 503, { error: "identity_not_configured" });
    }
    console.error("Entitlement lookup failed", error?.message || "unknown");
    return json(res, 500, { error: "entitlement_lookup_failed" });
  }
}
