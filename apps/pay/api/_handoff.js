import crypto from "node:crypto";

function safeEqualHex(left, right) {
  try {
    const a = Buffer.from(String(left || ""), "hex");
    const b = Buffer.from(String(right || ""), "hex");
    return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyInstantCloserHandoff(token, expectedOffer, expectedSource = "instant_closer") {
  const secret = String(process.env.INSTANT_CLOSER_SHARED_SECRET || "").trim();
  if (!secret) throw new Error("instant_closer_secret_missing");

  const rawToken = String(token || "").trim();
  const dot = rawToken.lastIndexOf(".");
  if (dot <= 0) throw new Error("instant_closer_handoff_invalid");

  const encoded = rawToken.slice(0, dot);
  const supplied = rawToken.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(encoded, "utf8")
    .digest("hex");

  if (!safeEqualHex(supplied, expected)) {
    throw new Error("instant_closer_handoff_invalid");
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new Error("instant_closer_handoff_invalid");
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    !payload ||
    Number(payload.company_id) <= 0 ||
    String(payload.offer || "") !== String(expectedOffer || "") ||
    String(payload.source || "") !== String(expectedSource || "") ||
    Number(payload.iat) > now + 30 ||
    Number(payload.exp) < now
  ) {
    throw new Error("instant_closer_handoff_invalid");
  }

  return {
    companyId: String(payload.company_id),
    source: String(payload.source),
    offer: String(payload.offer),
  };
}

export function signInstantCloserCallback(rawBody) {
  const secret = String(process.env.INSTANT_CLOSER_SHARED_SECRET || "").trim();
  if (!secret) throw new Error("instant_closer_secret_missing");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(\`\${timestamp}.\`, "utf8")
    .update(rawBody)
    .digest("hex");
  return \`t=\${timestamp},v1=\${signature}\`;
}
