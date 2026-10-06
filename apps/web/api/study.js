const MAX_BODY_BYTES = 1024 * 1024;

function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const length = Number(req.headers["content-length"] || 0);
  if (length > MAX_BODY_BYTES) return json(res, 413, { error: "body_too_large" });

  const base = String(process.env.INSTANTSTUDY_API_URL || "").trim().replace(/\/$/, "");
  const apiKey = String(process.env.INSTANTSTUDY_API_KEY || "").trim();
  if (!base || !apiKey) return json(res, 503, { error: "study_api_not_configured" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const contentText = typeof body.contentText === "string" ? body.contentText.slice(0, 200000) : "";
  const title = typeof body.title === "string" ? body.title.slice(0, 200) : undefined;
  const mode = ["learn", "review", "quiz", "test"].includes(body.mode) ? body.mode : "learn";

  if (!contentText.trim()) return json(res, 400, { error: "content_required" });

  try {
    const response = await fetch(`${base}/api/v1/study/prepare`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contentText,
        title,
        mode,
        maxQuestions: mode === "test" ? 20 : 12,
      }),
      signal: AbortSignal.timeout(20000),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json(res, response.status, {
        error: payload?.error || "study_api_error",
        message: payload?.message,
      });
    }

    return json(res, 200, payload);
  } catch {
    return json(res, 502, { error: "study_api_unavailable" });
  }
}
