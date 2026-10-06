export type StudyMode = "learn" | "review" | "quiz" | "test";

export type PreparedStudy = {
  studySessionId?: string;
  contentSessionId?: string;
  title?: string;
  mode: StudyMode;
  conceptCount?: number;
  next?: {
    done?: boolean;
    concept?: {
      id?: string;
      label?: string;
      sourceExcerpt?: string;
      mastery?: number;
      difficulty?: number;
    };
    questionPolicy?: {
      type?: string;
      instruction?: string;
    };
  };
  localFallback?: boolean;
};

function config() {
  return {
    base: import.meta.env.VITE_INSTANTSTUDY_API_URL as string | undefined,
    apiKey: import.meta.env.VITE_INSTANTSTUDY_API_KEY as string | undefined,
  };
}

export async function prepareStudy(input: {
  contentText: string;
  mode: StudyMode;
  title?: string;
}) {
  const { base, apiKey } = config();

  if (!base || !apiKey) {
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
            "Continue inside a connected LLM to begin the adaptive question loop.",
        },
      },
    } satisfies PreparedStudy;
  }

  const response = await fetch(
    `${base.replace(/\/$/, "")}/api/v1/study/prepare`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentText: input.contentText,
        title: input.title,
        mode: input.mode,
        maxQuestions: 12,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`InstantStudy preparation failed: ${response.status}`);
  }

  return (await response.json()) as PreparedStudy;
}
