import crypto from "node:crypto";

const LIVE_API = "https://api.paddle.com";
const SANDBOX_API = "https://sandbox-api.paddle.com";
const MAX_WEBHOOK_BYTES = 1024 * 1024;

export function paddleApiBase() {
  return String(process.env.PADDLE_ENV || "sandbox").toLowerCase() === "live"
    ? LIVE_API
    : SANDBOX_API;
}

export async function readRawBody(req) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_WEBHOOK_BYTES) {
      const error = new Error("webhook_body_too_large");
      error.code = "webhook_body_too_large";
      throw error;
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export function verifyPaddleSignature(rawBody, header) {
  const secret = String(process.env.PADDLE_WEBHOOK_SECRET || "").trim();
  if (!secret) throw new Error("paddle_webhook_secret_missing");

  const parts = {};
  for (const piece of String(header || "").split(";")) {
    const [key, value] = piece.split("=", 2);
    if (!key || !value) continue;
    if (!parts[key]) parts[key] = [];
    parts[key].push(value);
  }

  const timestamp = Number(parts.ts?.[0]);
  const signatures = parts.h1 || [];
  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new Error("paddle_signature_invalid");
  }

  const tolerance = Number(process.env.PADDLE_WEBHOOK_TOLERANCE_SECONDS || "300");
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > tolerance) {
    throw new Error("paddle_signature_stale");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}:${rawBody}`, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const valid = signatures.some((value) => {
    const candidate = Buffer.from(String(value), "utf8");
    return candidate.length === expectedBuffer.length &&
      crypto.timingSafeEqual(candidate, expectedBuffer);
  });

  if (!valid) throw new Error("paddle_signature_invalid");
}

export async function fetchPaddleCustomer(customerId) {
  if (!customerId) return null;
  const apiKey = String(process.env.PADDLE_API_KEY || "").trim();
  if (!apiKey) return null;

  const response = await fetch(`${paddleApiBase()}/customers/${encodeURIComponent(customerId)}`, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      "paddle-version": "1",
    },
  });
  if (!response.ok) return null;
  const body = await response.json().catch(() => ({}));
  return body?.data || null;
}
