import {
  addFamilyMember,
  hasActiveFamilyEntitlement,
  listFamilyMembers,
  removeFamilyMember,
} from "./_db.js";

function json(res, status, body) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.status(status);
  return res.end(JSON.stringify(body));
}

async function identityFromBearer(req) {
  const auth = String(req.headers.authorization || "");
  if (!auth.startsWith("Bearer ")) return null;

  const introspectionUrl = String(
    process.env.INSTANT_ACCOUNT_INTROSPECTION_URL || "",
  ).trim();
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

function validEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
    ? email
    : "";
}

export default async function handler(req, res) {
  try {
    const identity = await identityFromBearer(req);
    if (!identity) return json(res, 401, { error: "unauthorized" });

    const active = await hasActiveFamilyEntitlement(identity);
    if (!active) return json(res, 403, { error: "family_plan_required" });

    if (req.method === "GET") {
      const members = await listFamilyMembers(identity);
      return json(res, 200, {
        owner: identity.email || identity.userRef,
        seats: { total: 5, used: 1 + members.length, remaining: 4 - members.length },
        members,
      });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const email = validEmail(body.email);
    if (!email) return json(res, 400, { error: "valid_member_email_required" });

    if (req.method === "POST") {
      const members = await addFamilyMember(identity, email);
      return json(res, 200, {
        owner: identity.email || identity.userRef,
        seats: { total: 5, used: 1 + members.length, remaining: 4 - members.length },
        members,
      });
    }

    if (req.method === "DELETE") {
      const members = await removeFamilyMember(identity, email);
      return json(res, 200, {
        owner: identity.email || identity.userRef,
        seats: { total: 5, used: 1 + members.length, remaining: 4 - members.length },
        members,
      });
    }

    return json(res, 405, { error: "method_not_allowed" });
  } catch (error) {
    const code = String(error?.code || error?.message || "");
    if (code === "identity_not_configured") {
      return json(res, 503, { error: "identity_not_configured" });
    }
    if (code === "family_member_limit_reached") {
      return json(res, 409, { error: code });
    }
    if (code === "family_owner_cannot_invite_self") {
      return json(res, 400, { error: code });
    }
    if (code === "family_plan_required") {
      return json(res, 403, { error: code });
    }

    console.error("Family API failed", code || "unknown");
    return json(res, 500, { error: "family_api_failed" });
  }
}
