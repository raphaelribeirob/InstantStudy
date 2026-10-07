import { readInstantAccountSession } from "./instantBilling";

export type StudyMode = "learn" | "review" | "quiz" | "test";
export type TestQuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "free_recall"
  | "application";

export type StudyChoice = {
  label: string;
  value: string;
};

export type StudyQuestion = {
  done?: boolean;
  sessionId?: string;
  questionIndex?: number;
  totalPlanned?: number;
  concept?: {
    id?: string;
    label?: string;
    sourceExcerpt?: string;
    mastery?: number;
    difficulty?: number;
    nextReviewAt?: string;
  };
  question?: {
    prompt?: string;
    choices?: StudyChoice[];
    answerMode?: "choice" | "text";
    generatedBy?: string;
  };
  questionPolicy?: {
    type?: string;
    instruction?: string;
    immediateFeedback?: boolean;
  };
};

export type StudySummary = {
  sessionId?: string;
  mode?: StudyMode;
  attempts?: number;
  averageMastery?: number;
  weakConcepts?: Array<{
    id?: string;
    label?: string;
    mastery?: number;
    nextReviewAt?: string;
    missingConcepts?: string[];
  }>;
  nextReviewAt?: string;
  testResult?: {
    scorePercent?: number;
    answered?: number;
    totalQuestions?: number;
    durationSeconds?: number;
  };
};

export type PreparedStudy = {
  studySessionId?: string;
  contentSessionId?: string;
  title?: string;
  mode: StudyMode;
  conceptCount?: number;
  next?: StudyQuestion;
  localFallback?: boolean;
};

export type AnswerResult = {
  grade?: {
    correctness?: number;
    completeness?: number;
    confidence?: number;
    feedback?: string;
    missingConcepts?: string[];
    provider?: string;
    recorded?: boolean;
  };
  submission?: {
    done?: boolean;
    nextPolicy?: string;
    concept?: {
      mastery?: number;
      difficulty?: number;
      nextReviewAt?: string;
    };
    summary?: StudySummary;
  };
  next?: StudyQuestion | null;
};

export type StudyAssets = {
  summary: string;
  outline: string[];
  keyConcepts: string[];
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    concept: string;
  }>;
  generatedBy: string;
};

export type StudyMaterial = {
  id: string;
  learnerId: string;
  title: string;
  content: string;
  sourceType: "paste" | "upload" | "drive" | "audio";
  sourceNames: string[];
  assets: StudyAssets;
  createdAt: string;
  updatedAt: string;
};

export type StudyFileInput = {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  inline_base64?: string;
  download_url?: string;
};


export type RetentionInsights = {
  sessions: number;
  completedSessions: number;
  attempts: number;
  minutesStudied: number;
  averageMastery: number;
  retentionScore: number;
  dueNow: number;
  streakDays: number;
  activity7d: Array<{ date: string; attempts: number; minutes: number }>;
  strongConcepts: Array<{ label: string; mastery: number; attempts: number; nextReviewAt?: string }>;
  weakConcepts: Array<{ label: string; mastery: number; attempts: number; nextReviewAt?: string }>;
  charms: Array<{ id: string; title: string; description: string; unlocked: boolean }>;
};

export type StudyGame = {
  title: string;
  cards: Array<{
    id: string;
    pairId: string;
    kind: "prompt" | "answer";
    text: string;
  }>;
  pairCount: number;
  generatedBy: "deterministic";
};

export type AudioStudy = {
  title: string;
  estimatedMinutes: number;
  segments: Array<{ speaker: "Host" | "Coach"; text: string }>;
};

export type StudyRoom = {
  id: string;
  code: string;
  hostLearnerId: string;
  title: string;
  materialId?: string;
  summary: string;
  concepts: string[];
  createdAt: string;
  updatedAt: string;
  members: Array<{
    learnerId: string;
    displayName: string;
    joinedAt: string;
    progress: number;
    attempts: number;
  }>;
};

export type DueReview = {
  sessionId: string;
  title: string;
  conceptId: string;
  label: string;
  sourceExcerpt: string;
  mastery: number;
  difficulty: number;
  nextReviewAt: string;
  missingConcepts: string[];
};

function anonymousLearnerId() {
  const key = "instantstudy.learner_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const created = `web-${crypto.randomUUID()}`;
  localStorage.setItem(key, created);
  return created;
}

export function learnerContext() {
  const account = readInstantAccountSession();
  if (account) {
    return {
      learnerId: account.userId,
      accountUserId: account.userId,
      accountAccessToken: account.accessToken,
    };
  }

  return {
    learnerId: anonymousLearnerId(),
  };
}

async function request(payload: Record<string, unknown>) {
  const response = await fetch("/api/study", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.error === "string"
          ? data.error
          : `InstantStudy request failed: ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function identified(payload: Record<string, unknown>) {
  return { ...payload, ...learnerContext() };
}

export async function prepareStudy(input: {
  contentText: string;
  mode: StudyMode;
  title?: string;
  maxQuestions?: number;
  testDurationMinutes?: number;
  testQuestionTypes?: TestQuestionType[];
  concepts?: Array<{ label: string; sourceExcerpt?: string }>;
}) {
  try {
    return (await request(
      identified({
        action: "prepare",
        contentText: input.contentText,
        title: input.title,
        mode: input.mode,
        maxQuestions: input.maxQuestions,
        testDurationMinutes: input.testDurationMinutes,
        testQuestionTypes: input.testQuestionTypes,
        concepts: input.concepts,
      }),
    )) as PreparedStudy;
  } catch {
    return {
      title: input.title || "Study session",
      mode: input.mode,
      localFallback: true,
      next: {
        concept: {
          label: "Adaptive engine unavailable",
          sourceExcerpt: input.contentText.slice(0, 280),
        },
        question: {
          prompt: "The secure adaptive engine is currently unavailable.",
          answerMode: "text",
          generatedBy: "local-fallback",
        },
        questionPolicy: {
          type: input.mode === "test" ? "free_recall" : "adaptive",
          instruction: "Reconnect to continue this study session.",
        },
      },
    } satisfies PreparedStudy;
  }
}

export async function submitStudyAnswer(input: {
  studySessionId: string;
  conceptId: string;
  userAnswer: string;
}) {
  return (await request({
    action: "answer",
    studySessionId: input.studySessionId,
    conceptId: input.conceptId,
    userAnswer: input.userAnswer,
  })) as AnswerResult;
}

export async function nextStudyQuestion(studySessionId: string) {
  return (await request({
    action: "next",
    studySessionId,
  })) as StudyQuestion;
}

export async function finishStudySession(studySessionId: string) {
  return (await request({
    action: "finish",
    studySessionId,
  })) as StudySummary;
}

export async function askStudyMaterial(input: {
  contentText: string;
  question: string;
}) {
  return (await request({
    action: "ask",
    contentText: input.contentText,
    question: input.question,
  })) as {
    answer: string;
    sourceHighlights?: string[];
    provider?: string;
  };
}

export async function importStudyMaterial(input: {
  title?: string;
  sourceType: StudyMaterial["sourceType"];
  contentText?: string;
  files?: StudyFileInput[];
}) {
  return (await request(
    identified({
      action: "material_import",
      title: input.title,
      sourceType: input.sourceType,
      contentText: input.contentText,
      files: input.files,
    }),
  )) as {
    material: StudyMaterial;
    ingestion?: Array<{
      fileId?: string;
      fileName?: string;
      status?: string;
      extraction?: string;
      error?: string;
    }>;
  };
}

export async function listStudyMaterials(query = "") {
  return (await request(
    identified({
      action: "material_list",
      query,
      limit: 50,
    }),
  )) as { materials: StudyMaterial[] };
}

export async function getDueReviews(limit = 30) {
  return (await request(
    identified({
      action: "due",
      limit,
    }),
  )) as DueReview[];
}


export async function getRetentionInsights() {
  return (await request(
    identified({ action: "insights" }),
  )) as RetentionInsights;
}

export async function getStudyGame(materialId: string) {
  return (await request(
    identified({ action: "study_game", materialId }),
  )) as StudyGame;
}

export async function importPrivateDriveMaterial(input: {
  fileId: string;
  googleAccessToken: string;
  title?: string;
}) {
  return (await request(
    identified({
      action: "drive_private_import",
      fileId: input.fileId,
      googleAccessToken: input.googleAccessToken,
      title: input.title,
    }),
  )) as { material: StudyMaterial; ingestion: Array<Record<string, unknown>> };
}

export async function getAudioStudy(materialId: string) {
  return (await request(
    identified({ action: "audio_study", materialId }),
  )) as AudioStudy;
}

export async function createStudyRoom(input: {
  materialId: string;
  displayName: string;
}) {
  return (await request(
    identified({
      action: "room_create",
      materialId: input.materialId,
      displayName: input.displayName,
    }),
  )) as { room: StudyRoom };
}

export async function joinStudyRoom(input: {
  code: string;
  displayName: string;
}) {
  return (await request(
    identified({
      action: "room_join",
      code: input.code,
      displayName: input.displayName,
    }),
  )) as { room: StudyRoom };
}

export async function getStudyRoom(code: string) {
  return (await request(
    identified({
      action: "room_get",
      code,
    }),
  )) as { room: StudyRoom };
}

export async function updateStudyRoomProgress(input: {
  code: string;
  progress: number;
  attempts: number;
}) {
  return (await request(
    identified({
      action: "room_progress",
      code: input.code,
      progress: input.progress,
      attempts: input.attempts,
    }),
  )) as { room: StudyRoom };
}

export async function fileToStudyInput(file: File): Promise<StudyFileInput> {
  const maxBytes = 2_500_000;
  if (file.size > maxBytes) {
    throw new Error("Files uploaded through the web app are limited to 2.5 MB each.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunks: string[] = [];
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    chunks.push(String.fromCharCode(...chunk));
  }

  return {
    file_id: crypto.randomUUID(),
    file_name: file.name,
    mime_type: file.type || undefined,
    inline_base64: btoa(chunks.join("")),
  };
}

export function googleDriveStudyInput(url: string): StudyFileInput {
  const trimmed = url.trim();
  let id = "";

  try {
    const parsed = new URL(trimmed);
    const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    id = match?.[1] || parsed.searchParams.get("id") || "";
  } catch {
    id = "";
  }

  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) {
    throw new Error("Use a public Google Drive file link.");
  }

  return {
    file_id: `drive-${id}`,
    file_name: "Google Drive document",
    download_url:
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,
  };
}
