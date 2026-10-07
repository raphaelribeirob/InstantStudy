const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_INLINE_BASE64 = 3_500_000;
const ANON_ID = /^(web|flutter)-[A-Za-z0-9-]{8,200}$/;

function json(res, status, body) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  return res.end(JSON.stringify(body));
}

function cleanId(value, max = 200) {
  const text = typeof value === "string" ? value.trim() : "";
  return text && text.length <= max ? text : "";
}

function cleanFiles(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((item, index) => {
    const file = item && typeof item === "object" ? item : {};
    const inline =
      typeof file.inline_base64 === "string"
        ? file.inline_base64.slice(0, MAX_INLINE_BASE64)
        : undefined;
    const downloadUrl =
      typeof file.download_url === "string"
        ? file.download_url.slice(0, 2000)
        : undefined;

    return {
      file_id: cleanId(file.file_id, 200) || `upload-${index + 1}`,
      file_name:
        typeof file.file_name === "string"
          ? file.file_name.slice(0, 300)
          : undefined,
      mime_type:
        typeof file.mime_type === "string"
          ? file.mime_type.slice(0, 200)
          : undefined,
      inline_base64: inline,
      download_url: downloadUrl,
    };
  }).filter((file) => Boolean(file.inline_base64) !== Boolean(file.download_url));
}

async function upstream(base, apiKey, path, payload) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function upstreamGet(base, apiKey, path, params) {
  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: "application/json",
    },
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function verifiedLearner(body) {
  const learnerId = cleanId(body.learnerId);
  if (!learnerId) return "";

  if (ANON_ID.test(learnerId)) return learnerId;

  const accountUserId = cleanId(body.accountUserId);
  const accessToken = cleanId(body.accountAccessToken, 4000);
  if (!accountUserId || !accessToken || accountUserId !== learnerId) return "";

  const payBase = String(
    process.env.INSTANT_PAY_URL ||
      process.env.VITE_INSTANT_PAY_URL ||
      "https://instant-pay-gamma.vercel.app",
  ).replace(/\/$/, "");

  try {
    const response = await fetch(
      `${payBase}/v1/billing/entitlements?user_id=${encodeURIComponent(accountUserId)}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    return response.ok ? learnerId : "";
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });

  const length = Number(req.headers["content-length"] || 0);
  if (length > MAX_BODY_BYTES) return json(res, 413, { error: "body_too_large" });

  const base = String(process.env.INSTANTSTUDY_API_URL || "").trim().replace(/\/$/, "");
  const apiKey = String(process.env.INSTANTSTUDY_API_KEY || "").trim();
  if (!base || !apiKey) return json(res, 503, { error: "study_api_not_configured" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const allowedActions = [
    "prepare",
    "answer",
    "ask",
    "next",
    "finish",
    "due",
    "material_import",
    "material_list",
    "material_get",
    "insights",
    "audio_study",
    "room_create",
    "room_join",
    "room_get",
    "room_progress",
  ];
  const action = allowedActions.includes(body.action) ? body.action : "prepare";

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
      const learnerId = await verifiedLearner(body);
      const maxQuestions = Number.isInteger(body.maxQuestions)
        ? Math.max(1, Math.min(Number(body.maxQuestions), 50))
        : mode === "test" ? 20 : 12;
      const testDurationMinutes = Number.isInteger(body.testDurationMinutes)
        ? Math.max(1, Math.min(Number(body.testDurationMinutes), 180))
        : undefined;
      const concepts = Array.isArray(body.concepts)
        ? body.concepts
            .slice(0, 30)
            .map((item) => ({
              label: typeof item?.label === "string" ? item.label.slice(0, 200) : "",
              sourceExcerpt:
                typeof item?.sourceExcerpt === "string"
                  ? item.sourceExcerpt.slice(0, 1200)
                  : undefined,
            }))
            .filter((item) => item.label)
        : undefined;
      const validTypes = new Set([
        "multiple_choice",
        "true_false",
        "short_answer",
        "free_recall",
        "application",
      ]);
      const testQuestionTypes = Array.isArray(body.testQuestionTypes)
        ? body.testQuestionTypes.filter((item) => validTypes.has(item)).slice(0, 5)
        : undefined;

      if (!contentText.trim()) {
        return json(res, 400, { error: "content_required" });
      }

      result = await upstream(base, apiKey, "/api/v1/study/prepare", {
        contentText,
        title,
        mode,
        learnerId: learnerId || undefined,
        maxQuestions,
        testDurationMinutes,
        testQuestionTypes: testQuestionTypes?.length ? testQuestionTypes : undefined,
        concepts: concepts?.length ? concepts : undefined,
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
    } else if (action === "finish") {
      const studySessionId = cleanId(body.studySessionId, 64);
      if (!studySessionId) return json(res, 400, { error: "session_required" });
      result = await upstream(base, apiKey, "/api/v1/study/finish", { studySessionId });
    } else if (action === "due") {
      const learnerId = await verifiedLearner(body);
      if (!learnerId) return json(res, 401, { error: "learner_identity_required" });
      result = await upstreamGet(base, apiKey, "/api/v1/study/due", {
        learnerId,
        limit: Math.max(1, Math.min(Number(body.limit || 20), 100)),
      });
    } else if (action === "material_import") {
      const learnerId = await verifiedLearner(body);
      if (!learnerId) return json(res, 401, { error: "learner_identity_required" });

      const sourceType = ["paste", "upload", "drive", "audio"].includes(body.sourceType)
        ? body.sourceType
        : "paste";
      const contentText =
        typeof body.contentText === "string" ? body.contentText.slice(0, 200000) : "";
      const files = cleanFiles(body.files);

      if (!contentText.trim() && !files.length) {
        return json(res, 400, { error: "material_input_required" });
      }

      result = await upstream(base, apiKey, "/api/v1/materials/import", {
        learnerId,
        title:
          typeof body.title === "string" ? body.title.slice(0, 200) : undefined,
        sourceType,
        contentText: contentText || undefined,
        files,
      });
    } else if (action === "insights") {
      const learnerId = await verifiedLearner(body);
      if (!learnerId) return json(res, 401, { error: "learner_identity_required" });
      result = await upstream(base, apiKey, "/api/v1/insights", { learnerId });
    } else if (action === "audio_study") {
      const learnerId = await verifiedLearner(body);
      const materialId = cleanId(body.materialId, 64);
      if (!learnerId || !materialId) {
        return json(res, 400, { error: "audio_study_input_invalid" });
      }
      result = await upstream(base, apiKey, "/api/v1/audio-study", {
        learnerId,
        materialId,
      });
    } else if (action === "room_create") {
      const learnerId = await verifiedLearner(body);
      const materialId = cleanId(body.materialId, 64);
      const displayName =
        typeof body.displayName === "string" ? body.displayName.trim().slice(0, 80) : "";
      if (!learnerId || !materialId || !displayName) {
        return json(res, 400, { error: "room_create_input_invalid" });
      }
      result = await upstream(base, apiKey, "/api/v1/rooms/create", {
        learnerId,
        materialId,
        displayName,
      });
    } else if (action === "room_join") {
      const learnerId = await verifiedLearner(body);
      const displayName =
        typeof body.displayName === "string" ? body.displayName.trim().slice(0, 80) : "";
      const code =
        typeof body.code === "string" ? body.code.trim().toUpperCase().slice(0, 12) : "";
      if (!learnerId || !displayName || !code) {
        return json(res, 400, { error: "room_join_input_invalid" });
      }
      result = await upstream(base, apiKey, "/api/v1/rooms/join", {
        learnerId,
        displayName,
        code,
      });
    } else if (action === "room_get") {
      const learnerId = await verifiedLearner(body);
      const code =
        typeof body.code === "string" ? body.code.trim().toUpperCase().slice(0, 12) : "";
      if (!learnerId || !code) {
        return json(res, 400, { error: "room_get_input_invalid" });
      }
      result = await upstream(base, apiKey, "/api/v1/rooms/get", {
        learnerId,
        code,
      });
    } else if (action === "room_progress") {
      const learnerId = await verifiedLearner(body);
      const code =
        typeof body.code === "string" ? body.code.trim().toUpperCase().slice(0, 12) : "";
      const progress = Number(body.progress);
      const attempts = Number(body.attempts);
      if (
        !learnerId ||
        !code ||
        !Number.isFinite(progress) ||
        progress < 0 ||
        progress > 1 ||
        !Number.isInteger(attempts) ||
        attempts < 0
      ) {
        return json(res, 400, { error: "room_progress_input_invalid" });
      }
      result = await upstream(base, apiKey, "/api/v1/rooms/progress", {
        learnerId,
        code,
        progress,
        attempts,
      });
    } else if (action === "material_list") {
      const learnerId = await verifiedLearner(body);
      if (!learnerId) return json(res, 401, { error: "learner_identity_required" });

      result = await upstream(base, apiKey, "/api/v1/materials/list", {
        learnerId,
        query: typeof body.query === "string" ? body.query.slice(0, 200) : "",
        limit: Math.max(1, Math.min(Number(body.limit || 50), 100)),
      });
    } else {
      const learnerId = await verifiedLearner(body);
      const id = cleanId(body.id, 64);
      if (!learnerId || !id) {
        return json(res, 400, { error: "material_get_invalid" });
      }
      result = await upstream(base, apiKey, "/api/v1/materials/get", {
        learnerId,
        id,
      });
    }

    if (!result.response.ok) {
      return json(res, result.response.status, {
        error: result.data?.error || "study_api_error",
        message: result.data?.message,
        usage: result.data?.usage,
        ingestion: result.data?.ingestion,
      });
    }

    return json(res, 200, result.data);
  } catch {
    return json(res, 502, { error: "study_api_unavailable" });
  }
}
