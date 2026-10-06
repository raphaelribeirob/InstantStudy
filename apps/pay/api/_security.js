const MAX_JSON_BODY_BYTES = 8 * 1024;

function firstHeader(value) {
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
}

export function requestOriginAllowed(req) {
  const rawOrigin = firstHeader(req.headers?.origin).trim();
  if (!rawOrigin) return true;

  const rawHost = (
    firstHeader(req.headers?.["x-forwarded-host"]) ||
    firstHeader(req.headers?.host)
  ).trim();

  if (!rawHost) return false;

  try {
    const origin = new URL(rawOrigin);
    return origin.protocol === "https:" && origin.host === rawHost;
  } catch {
    return false;
  }
}

export function isJsonRequest(req) {
  const contentType = firstHeader(req.headers?.["content-type"]).toLowerCase();
  return contentType.startsWith("application/json");
}

export function bodyWithinLimit(body) {
  try {
    return Buffer.byteLength(JSON.stringify(body ?? {}), "utf8") <= MAX_JSON_BODY_BYTES;
  } catch {
    return false;
  }
}

export function enforceApiRequest(req, res, json) {
  if (!requestOriginAllowed(req)) {
    json(res, 403, { error: "origin_not_allowed" });
    return false;
  }

  if (!isJsonRequest(req)) {
    json(res, 415, { error: "content_type_not_supported" });
    return false;
  }

  if (!bodyWithinLimit(req.body)) {
    json(res, 413, { error: "request_too_large" });
    return false;
  }

  return true;
}
