export type StudyMode = "learn" | "review" | "quiz" | "test";

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
  questionPolicy?: {
    type?: string;
    instruction?: string;
    immediateFeedback?: boolean;
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
    summary?: unknown;
  };
  next?: StudyQuestion | null;
};

function learnerId() {
  const key = "instantstudy.learner_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;

  const created = `web-${crypto.randomUUID()}`;
  localStorage.setItem(key, created);
  return created;
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

export async function prepareStudy(input: {
  contentText: string;
  mode: StudyMode;
  title?: string;
}) {
  try {
    return (await request({
      action: "prepare",
      contentText: input.contentText,
      title: input.title,
      mode: input.mode,
      learnerId: learnerId(),
    })) as PreparedStudy;
  } catch {
    return {
      title: input.title || "Study session",
      mode: input.mode,
      localFallback: true,
      next: {
        concept: {
          label: "Your material is ready",
          sourceExcerpt: input.contentText.slice(0, 280),
        },
        questionPolicy: {
          type: input.mode === "test" ? "free_recall" : "adaptive",
          instruction:
            "The local software is ready. The secure adaptive engine is currently unavailable.",
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
  return await request({
    action: "finish",
    studySessionId,
  });
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
