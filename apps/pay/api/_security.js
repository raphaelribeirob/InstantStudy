import crypto from "node:crypto";

export function serverKeyConfigured() {
  return Boolean(String(process.env.INSTANT_PAY_SERVER_KEY || "").trim());
}

export function isServerAuthorized(req) {
  const expected = String(process.env.INSTANT_PAY_SERVER_KEY || "").trim();
  if (!expected) return false;
  const header = String(req.headers?.authorization || "");
  const [scheme, token] = header.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return false;
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(token);
  if (expectedBuffer.length !== suppliedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export function cleanSubjectId(value) {
  const subject = String(value || "").trim();
  return /^[a-z0-9:_-]{3,160}$/i.test(subject) ? subject : null;
}

export function parsePaddleSignature(header) {
  const values = {};
  for (const piece of String(header || "").split(";")) {
    const [key, value] = piece.split("=", 2);
    if (!key || !value) continue;
    (values[key] ||= []).push(value);
  }
  const timestamp = values.ts?.[0] ? Number(values.ts[0]) : NaN;
  return {
    timestamp,
    signatures: values.h1 || [],
  };
}

export function verifyPaddleSignature({
  rawBody,
  header,
  secret = process.env.PADDLE_WEBHOOK_SECRET,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = Number(process.env.PADDLE_WEBHOOK_TOLERANCE_SECONDS || "300"),
}) {
  const key = String(secret || "").trim();
  if (!key) return { ok: false, reason: "webhook_secret_not_configured" };

  const { timestamp, signatures } = parsePaddleSignature(header);
  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    return { ok: false, reason: "invalid_signature_header" };
  }
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { ok: false, reason: "stale_signature" };
  }

  const expected = crypto
    .createHmac("sha256", key)
    .update(`${timestamp}:${rawBody}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected);
  const matches = signatures.some((candidate) => {
    const candidateBuffer = Buffer.from(String(candidate));
    return (
      candidateBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, candidateBuffer)
    );
  });
  return { ok: matches, reason: matches ? null : "invalid_signature" };
}
