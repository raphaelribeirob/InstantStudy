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

export async function prepareStudy(input: {
  contentText: string;
  mode: StudyMode;
  title?: string;
}) {
  const response = await fetch("/api/study", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contentText: input.contentText,
      title: input.title,
      mode: input.mode,
    }),
  });

  if (!response.ok) {
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
            "The local software shell is ready. Connect the secure study API or plugin to start adaptive evaluation.",
        },
      },
    } satisfies PreparedStudy;
  }

  return (await response.json()) as PreparedStudy;
}
