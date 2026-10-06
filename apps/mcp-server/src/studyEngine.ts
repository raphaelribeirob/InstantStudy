import { randomUUID } from "node:crypto";
import type { ContentSession, StudyMode } from "./contentSessions.js";

export type StudyEvaluation = {
  correctness: number;
  completeness: number;
  confidence?: number;
  missingConcepts?: string[];
  userAnswer?: string;
  feedback?: string;
};

export type ConceptState = {
  id: string;
  label: string;
  sourceExcerpt: string;
  mastery: number;
  attempts: number;
  correct: number;
  partial: number;
  incorrect: number;
  difficulty: number;
  lastSeenAt?: string;
  missingConcepts: string[];
};

export type StudyAttempt = {
  id: string;
  conceptId: string;
  questionIndex: number;
  createdAt: string;
  correctness: number;
  completeness: number;
  confidence: number;
  userAnswer?: string;
  feedback?: string;
  missingConcepts: string[];
};

export type AdaptiveStudySession = {
  id: string;
  contentSessionId: string;
  title: string;
  mode: StudyMode;
  goal?: string;
  createdAt: string;
  status: "active" | "completed";
  questionIndex: number;
  maxQuestions: number;
  targetMinutes?: number;
  concepts: ConceptState[];
  attempts: StudyAttempt[];
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitCandidateConcepts(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);

  const headings = lines
    .filter(
      (line) =>
        line.length >= 3 &&
        line.length <= 100 &&
        (/^#{1,6}\s/.test(line) ||
          /^[A-ZÀ-Ý][^.!?]{2,80}:?$/.test(line) ||
          /^\d+(?:\.\d+)*[.)]?\s+/.test(line)),
    )
    .map((line) =>
      line.replace(/^#{1,6}\s*/, "").replace(/^\d+(?:\.\d+)*[.)]?\s+/, ""),
    );

  const sentences = normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length >= 40 && sentence.length <= 320);

  return [...headings, ...sentences];
}

function labelFromExcerpt(excerpt: string) {
  const cleaned = excerpt
    .replace(/^[•*-]\s*/, "")
    .replace(/[:.;!?]+$/, "")
    .trim();

  if (cleaned.length <= 72) return cleaned;
  return `${cleaned.slice(0, 69).trim()}…`;
}

export function deriveConcepts(text: string, limit = 12): ConceptState[] {
  const candidates = splitCandidateConcepts(text);
  const seen = new Set<string>();
  const concepts: ConceptState[] = [];

  for (const candidate of candidates) {
    const excerpt = normalizeWhitespace(candidate);
    const label = labelFromExcerpt(excerpt);
    const key = label.toLocaleLowerCase();

    if (label.length < 3 || seen.has(key)) continue;
    seen.add(key);

    concepts.push({
      id: randomUUID(),
      label,
      sourceExcerpt: excerpt.slice(0, 600),
      mastery: 0.15,
      attempts: 0,
      correct: 0,
      partial: 0,
      incorrect: 0,
      difficulty: 1,
      missingConcepts: [],
    });

    if (concepts.length >= limit) break;
  }

  if (!concepts.length && text.trim()) {
    const excerpt = normalizeWhitespace(text).slice(0, 600);
    concepts.push({
      id: randomUUID(),
      label: "Core material",
      sourceExcerpt: excerpt,
      mastery: 0.15,
      attempts: 0,
      correct: 0,
      partial: 0,
      incorrect: 0,
      difficulty: 1,
      missingConcepts: [],
    });
  }

  return concepts;
}

function questionType(mode: StudyMode, difficulty: number) {
  if (mode === "test") {
    return difficulty >= 3 ? "application" : "free_recall";
  }

  if (mode === "quiz") {
    return difficulty <= 1 ? "short_answer" : "free_recall";
  }

  if (mode === "review") {
    return "free_recall";
  }

  if (difficulty <= 1) return "guided_recall";
  if (difficulty === 2) return "free_recall";
  if (difficulty === 3) return "explain_why";
  return "application";
}

function chooseConcept(session: AdaptiveStudySession) {
  const ordered = [...session.concepts].sort((a, b) => {
    const aPriority =
      (1 - a.mastery) * 0.7 +
      (a.attempts === 0 ? 0.25 : 0) +
      Math.min(a.incorrect * 0.05, 0.15);
    const bPriority =
      (1 - b.mastery) * 0.7 +
      (b.attempts === 0 ? 0.25 : 0) +
      Math.min(b.incorrect * 0.05, 0.15);

    return bPriority - aPriority;
  });

  if (session.mode === "test") {
    return ordered[session.questionIndex % ordered.length];
  }

  return ordered[0];
}

export class StudyEngine {
  private sessions = new Map<string, AdaptiveStudySession>();

  start(
    content: ContentSession,
    options?: {
      mode?: StudyMode;
      targetMinutes?: number;
      maxQuestions?: number;
      concepts?: Array<{ label: string; sourceExcerpt?: string }>;
    },
  ) {
    const rawText = content.contentText?.trim() ?? "";
    const concepts = options?.concepts?.length
      ? options.concepts.slice(0, 30).map((concept) => ({
          id: randomUUID(),
          label: concept.label.trim(),
          sourceExcerpt: (concept.sourceExcerpt ?? concept.label).trim().slice(0, 600),
          mastery: 0.15,
          attempts: 0,
          correct: 0,
          partial: 0,
          incorrect: 0,
          difficulty: 1,
          missingConcepts: [],
        }))
      : deriveConcepts(rawText, 12);

    if (!concepts.length) {
      throw new Error(
        "InstantStudy could not identify study concepts. Provide extracted contentText or explicit concepts.",
      );
    }

    const session: AdaptiveStudySession = {
      id: randomUUID(),
      contentSessionId: content.id,
      title: content.title,
      mode: options?.mode ?? content.mode,
      goal: content.goal,
      createdAt: new Date().toISOString(),
      status: "active",
      questionIndex: 0,
      maxQuestions: Math.max(1, Math.min(options?.maxQuestions ?? 12, 50)),
      targetMinutes: options?.targetMinutes,
      concepts,
      attempts: [],
    };

    this.sessions.set(session.id, session);
    return session;
  }

  get(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  next(sessionId: string) {
    const session = this.requireActive(sessionId);

    if (
      session.questionIndex >= session.maxQuestions ||
      session.concepts.every((concept) => concept.mastery >= 0.88)
    ) {
      return {
        done: true as const,
        summary: this.summary(session),
      };
    }

    const concept = chooseConcept(session);
    const type = questionType(session.mode, concept.difficulty);

    return {
      done: false as const,
      sessionId: session.id,
      questionIndex: session.questionIndex + 1,
      totalPlanned: session.maxQuestions,
      mode: session.mode,
      concept: {
        id: concept.id,
        label: concept.label,
        sourceExcerpt: concept.sourceExcerpt,
        mastery: Number(concept.mastery.toFixed(2)),
        difficulty: concept.difficulty,
      },
      questionPolicy: {
        type,
        revealAnswerBeforeAttempt: false,
        immediateFeedback: session.mode !== "test",
        guidance:
          session.mode === "learn" && concept.difficulty <= 1
            ? "light"
            : "none",
        instruction:
          session.mode === "test"
            ? "Ask one exam-style question based only on the supplied source. Do not give hints or correctness feedback until the test ends."
            : session.mode === "quiz"
              ? "Ask one concise question. After the learner answers, grade it and explain briefly."
              : session.mode === "review"
                ? "Use active recall. Ask directly and keep the interaction fast."
                : "Teach adaptively: ask one question at the current difficulty, then use the answer quality to decide whether to scaffold or increase difficulty.",
      },
    };
  }

  submit(
    sessionId: string,
    conceptId: string,
    evaluation: StudyEvaluation,
  ) {
    const session = this.requireActive(sessionId);
    const concept = session.concepts.find((item) => item.id === conceptId);

    if (!concept) throw new Error("Concept not found in this study session.");

    const correctness = clamp(evaluation.correctness);
    const completeness = clamp(evaluation.completeness);
    const confidence = clamp(evaluation.confidence ?? 0.8);
    const performance = correctness * 0.65 + completeness * 0.35;
    const prior = concept.mastery;

    concept.attempts += 1;
    concept.lastSeenAt = new Date().toISOString();
    concept.missingConcepts = [...new Set(evaluation.missingConcepts ?? [])].slice(0, 10);

    if (performance >= 0.85) concept.correct += 1;
    else if (performance >= 0.5) concept.partial += 1;
    else concept.incorrect += 1;

    const learningRate = session.mode === "learn" ? 0.48 : 0.38;
    concept.mastery = clamp(prior * (1 - learningRate) + performance * learningRate);

    if (performance >= 0.82 && completeness >= 0.75) {
      concept.difficulty = Math.min(4, concept.difficulty + 1);
    } else if (performance < 0.45) {
      concept.difficulty = Math.max(1, concept.difficulty - 1);
    }

    const attempt: StudyAttempt = {
      id: randomUUID(),
      conceptId,
      questionIndex: session.questionIndex + 1,
      createdAt: new Date().toISOString(),
      correctness,
      completeness,
      confidence,
      userAnswer: evaluation.userAnswer,
      feedback: evaluation.feedback,
      missingConcepts: concept.missingConcepts,
    };

    session.attempts.push(attempt);
    session.questionIndex += 1;

    const needsRepair = performance < 0.65;
    const done =
      session.questionIndex >= session.maxQuestions ||
      session.concepts.every((item) => item.mastery >= 0.88);

    return {
      sessionId: session.id,
      activationEvent:
        session.attempts.length === 1 ? "first_answer_submitted" : undefined,
      evaluation: {
        correctness,
        completeness,
        confidence,
        performance: Number(performance.toFixed(2)),
        needsRepair,
        suppressImmediateFeedback: session.mode === "test",
      },
      concept: {
        id: concept.id,
        label: concept.label,
        mastery: Number(concept.mastery.toFixed(2)),
        difficulty: concept.difficulty,
        missingConcepts: concept.missingConcepts,
      },
      nextPolicy: done
        ? "finish"
        : needsRepair && session.mode === "learn"
          ? "repair_then_retest"
          : "continue",
      done,
      summary: done ? this.summary(session) : undefined,
    };
  }

  finish(sessionId: string) {
    const session = this.get(sessionId);
    if (!session) throw new Error("Study session not found.");

    session.status = "completed";
    return this.summary(session);
  }

  private requireActive(sessionId: string) {
    const session = this.get(sessionId);
    if (!session) throw new Error("Study session not found.");
    if (session.status !== "active") throw new Error("Study session is completed.");
    return session;
  }

  private summary(session: AdaptiveStudySession) {
    const attempts = session.attempts.length;
    const averageMastery =
      session.concepts.reduce((sum, concept) => sum + concept.mastery, 0) /
      session.concepts.length;

    const weakConcepts = [...session.concepts]
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, Math.min(5, session.concepts.length))
      .filter((concept) => concept.mastery < 0.75)
      .map((concept) => ({
        id: concept.id,
        label: concept.label,
        mastery: Number(concept.mastery.toFixed(2)),
        missingConcepts: concept.missingConcepts,
      }));

    return {
      sessionId: session.id,
      mode: session.mode,
      attempts,
      averageMastery: Number(averageMastery.toFixed(2)),
      conceptsStudied: session.concepts.filter((concept) => concept.attempts > 0).length,
      weakConcepts,
      completed: session.status === "completed" || session.questionIndex >= session.maxQuestions,
    };
  }
}
