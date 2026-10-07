import { billingSql, ensureBillingSchema } from "./_db.js";
import { cleanSubjectId, isServerAuthorized, serverKeyConfigured } from "./_security.js";

function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "method_not_allowed" });
  if (!serverKeyConfigured()) return json(res, 503, { error: "server_auth_not_configured" });
  if (!isServerAuthorized(req)) return json(res, 401, { error: "unauthorized" });

  const subjectId = cleanSubjectId(req.query?.subject_id);
  if (!subjectId) return json(res, 400, { error: "invalid_subject_id" });

  try {
    await ensureBillingSchema();
    const sql = billingSql();
    const rows = await sql`
      SELECT
        entitlement_key,
        active,
        status,
        provider,
        expires_at,
        updated_at
      FROM instant_pay_entitlements
      WHERE subject_id = ${subjectId}
      ORDER BY entitlement_key
    `;

    return json(res, 200, {
      subject_id: subjectId,
      entitlements: rows.map((row) => ({
        key: row.entitlement_key,
        active: Boolean(row.active),
        status: row.status,
        provider: "instant_pay",
        processor: row.provider,
        expires_at: row.expires_at || null,
        updated_at: row.updated_at || null,
      })),
    });
  } catch (error) {
    console.error("InstantPay entitlement lookup failed", error);
    return json(res, 503, { error: "entitlement_store_unavailable" });
  }
}
