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

async function verifiedBillingPlan(body) {
  const learnerId = cleanId(body.learnerId);
  if (!learnerId || ANON_ID.test(learnerId)) return "free";

  const accountUserId = cleanId(body.accountUserId);
  const accessToken = cleanId(body.accountAccessToken, 4000);
  if (!accountUserId || !accessToken || accountUserId !== learnerId) return "free";

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
    if (!response.ok) return "free";
    const payload = await response.json().catch(() => ({}));
    const active = Array.isArray(payload.entitlements)
      ? payload.entitlements.filter((item) => item?.active === true).map((item) => String(item.key || ""))
      : [];
    if (
      active.includes("instant_study.unlimited") ||
      active.includes("instant_study.family") ||
      active.includes("instant_study.family_member")
    ) {
      return "unlimited";
    }
    if (active.includes("instant_study.plus")) return "plus";
    return "free";
  } catch {
    return "free";
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
    "study_game",
    "drive_private_import",
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
      const allowedLocales = new Set(["nl","en","fr","de","id","it","ja","ko","pl","pt-BR","ru","zh-CN","es","tr","uk","vi"]);
      const locale = allowedLocales.has(body.locale) ? body.locale : undefined;
      const billingPlan = learnerId
        ? await verifiedBillingPlan(body)
        : "free";
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
        locale,
        billingPlan,
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
    } else if (action === "study_game") {
      const learnerId = await verifiedLearner(body);
      const materialId = cleanId(body.materialId, 64);
      if (!learnerId || !materialId) {
        return json(res, 400, { error: "study_game_input_invalid" });
      }
      result = await upstream(base, apiKey, "/api/v1/study-game", {
        learnerId,
        materialId,
      });
    } else if (action === "drive_private_import") {
      const learnerId = await verifiedLearner(body);
      const fileId = cleanId(body.fileId, 220);
      const accessToken = cleanId(body.googleAccessToken, 4096);
      const requestedTitle =
        typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";

      if (
        !learnerId ||
        !accessToken ||
        !/^[A-Za-z0-9_-]{8,220}$/.test(fileId)
      ) {
        return json(res, 400, { error: "drive_private_input_invalid" });
      }

      const metadataUrl =
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size`;
      const metadataResponse = await fetch(metadataUrl, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
        },
        signal: AbortSignal.timeout(20_000),
      });
      const metadata = await metadataResponse.json().catch(() => ({}));
      if (!metadataResponse.ok) {
        return json(res, metadataResponse.status === 401 ? 401 : 502, {
          error: metadataResponse.status === 401
            ? "google_drive_authorization_expired"
            : "google_drive_metadata_failed",
        });
      }

      const mimeType = String(metadata.mimeType || "");
      const name = String(metadata.name || "Google Drive file").slice(0, 260);
      const googleType = "application/vnd.google-apps.";
      let downloadUrl;
      let outputMime = mimeType;
      let outputName = name;

      if (mimeType === `${googleType}document`) {
        outputMime = "text/plain";
        outputName = name.endsWith(".txt") ? name : `${name}.txt`;
        downloadUrl =
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(outputMime)}`;
      } else if (mimeType === `${googleType}spreadsheet`) {
        outputMime = "text/csv";
        outputName = name.endsWith(".csv") ? name : `${name}.csv`;
        downloadUrl =
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(outputMime)}`;
      } else if (
        mimeType === `${googleType}presentation` ||
        mimeType === `${googleType}drawing`
      ) {
        outputMime = "application/pdf";
        outputName = name.endsWith(".pdf") ? name : `${name}.pdf`;
        downloadUrl =
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(outputMime)}`;
      } else if (mimeType.startsWith(googleType)) {
        return json(res, 415, { error: "google_drive_type_not_supported" });
      } else {
        downloadUrl =
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
      }

      const driveResponse = await fetch(downloadUrl, {
        headers: { authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(30_000),
      });
      if (!driveResponse.ok) {
        return json(res, driveResponse.status === 401 ? 401 : 502, {
          error: driveResponse.status === 401
            ? "google_drive_authorization_expired"
            : "google_drive_download_failed",
        });
      }

      const bytes = Buffer.from(await driveResponse.arrayBuffer());
      if (bytes.length > 2_500_000) {
        return json(res, 413, {
          error: "google_drive_file_too_large",
          message: "Private Drive imports are limited to 2.5 MB in this release.",
        });
      }

      result = await upstream(base, apiKey, "/api/v1/materials/import", {
        learnerId,
        title: requestedTitle || name,
        sourceType: "drive",
        files: [
          {
            file_id: `drive-${fileId}`,
            file_name: outputName,
            mime_type: outputMime,
            inline_base64: bytes.toString("base64"),
          },
        ],
      });
    } else if (action === "audio_study") {
      const learnerId = await verifiedLearner(body);
      const locales = new Set(["nl","en","fr","de","id","it","ja","ko","pl","pt-BR","ru","zh-CN","es","tr","uk","vi"]);
      const locale = locales.has(body.locale) ? body.locale : undefined;
      const materialId = cleanId(body.materialId, 64);
      if (!learnerId || !materialId) {
        return json(res, 400, { error: "audio_study_input_invalid" });
      }
      result = await upstream(base, apiKey, "/api/v1/audio-study", {
        learnerId,
        materialId,
        locale,
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
