const MAX_BODY_BYTES = 1024 * 1024;

function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.end(JSON.stringify(body));
}

function cleanId(value, max = 200) {
  const text = typeof value === "string" ? value.trim() : "";
  return text && text.length <= max ? text : "";
}

async function upstream(base, apiKey, path, payload) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(25_000),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const length = Number(req.headers["content-length"] || 0);
  if (length > MAX_BODY_BYTES) return json(res, 413, { error: "body_too_large" });

  const base = String(process.env.INSTANTSTUDY_API_URL || "").trim().replace(/\/$/, "");
  const apiKey = String(process.env.INSTANTSTUDY_API_KEY || "").trim();
  if (!base || !apiKey) return json(res, 503, { error: "study_api_not_configured" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const action = ["prepare", "answer", "ask", "next", "finish"].includes(body.action)
    ? body.action
    : "prepare";

  try {
    let result;

    if (action === "prepare") {
      const contentText =
        typeof body.contentText === "string" ? body.contentText.slice(0, 200000) : "";
      const title =
        typeof body.title === "string" ? body.title.slice(0, 200) : undefined;
      const mode = ["learn", "review", "quiz", "test"].includes(body.mode)
        ? body.mode
        : "learn";
      const learnerId = cleanId(body.learnerId);

      if (!contentText.trim()) {
        return json(res, 400, { error: "content_required" });
      }

      result = await upstream(base, apiKey, "/api/v1/study/prepare", {
        contentText,
        title,
        mode,
        learnerId: learnerId || undefined,
        maxQuestions: mode === "test" ? 20 : 12,
      });
    } else if (action === "answer") {
      const studySessionId = cleanId(body.studySessionId, 64);
      const conceptId = cleanId(body.conceptId, 64);
      const userAnswer =
        typeof body.userAnswer === "string" ? body.userAnswer.slice(0, 20000) : "";

      if (!studySessionId || !conceptId || !userAnswer.trim()) {
        return json(res, 400, { error: "answer_input_invalid" });
      }

      result = await upstream(base, apiKey, "/api/v1/study/evaluate", {
        studySessionId,
        conceptId,
        userAnswer,
      });
    } else if (action === "ask") {
      const contentText =
        typeof body.contentText === "string" ? body.contentText.slice(0, 200000) : "";
      const question =
        typeof body.question === "string" ? body.question.slice(0, 2000) : "";

      if (!contentText.trim() || !question.trim()) {
        return json(res, 400, { error: "ask_input_invalid" });
      }

      result = await upstream(base, apiKey, "/api/v1/ask", {
        contentText,
        question,
      });
    } else if (action === "next") {
      const studySessionId = cleanId(body.studySessionId, 64);
      if (!studySessionId) return json(res, 400, { error: "session_required" });
      result = await upstream(base, apiKey, "/api/v1/study/next", { studySessionId });
    } else {
      const studySessionId = cleanId(body.studySessionId, 64);
      if (!studySessionId) return json(res, 400, { error: "session_required" });
      result = await upstream(base, apiKey, "/api/v1/study/finish", { studySessionId });
    }

    if (!result.response.ok) {
      return json(res, result.response.status, {
        error: result.data?.error || "study_api_error",
        message: result.data?.message,
        usage: result.data?.usage,
      });
    }

    return json(res, 200, result.data);
  } catch {
    return json(res, 502, { error: "study_api_unavailable" });
  }
}
