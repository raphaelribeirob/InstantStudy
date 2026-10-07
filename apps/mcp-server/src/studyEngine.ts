import { randomUUID } from "node:crypto";
import type { ContentSession, StudyMode } from "./contentSessions.js";
import {
  createStudyPersistence,
  type DueReview,
  type StudyPersistence,
} from "./studyPersistence.js";
import { generateQuestion } from "./questionGenerator.js";

export type TestQuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "free_recall"
  | "application";

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
  lastPerformance?: number;
  stabilityDays: number;
  nextReviewAt?: string;
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

export type TestConfig = {
  startedAt: string;
  durationMinutes?: number;
  endsAt?: string;
  questionTypes: TestQuestionType[];
  feedbackPolicy: "end_only";
};

export type AdaptiveStudySession = {
  id: string;
  contentSessionId: string;
  learnerId?: string;
  title: string;
  mode: StudyMode;
  goal?: string;
  createdAt: string;
  completedAt?: string;
  status: "active" | "completed";
  questionIndex: number;
  maxQuestions: number;
  targetMinutes?: number;
  concepts: ConceptState[];
  attempts: StudyAttempt[];
  testConfig?: TestConfig;
};

const DAY_MS = 86_400_000;

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function conceptKey(value: string) {
  return normalizeWhitespace(value).toLocaleLowerCase();
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

function blankConcept(label: string, sourceExcerpt: string): ConceptState {
  return {
    id: randomUUID(),
    label,
    sourceExcerpt,
    mastery: 0.15,
    attempts: 0,
    correct: 0,
    partial: 0,
    incorrect: 0,
    difficulty: 1,
    stabilityDays: 0.25,
    missingConcepts: [],
  };
}

export function deriveConcepts(text: string, limit = 12): ConceptState[] {
  const candidates = splitCandidateConcepts(text);
  const seen = new Set<string>();
  const concepts: ConceptState[] = [];

  for (const candidate of candidates) {
    const excerpt = normalizeWhitespace(candidate);
    const label = labelFromExcerpt(excerpt);
    const key = conceptKey(label);

    if (label.length < 3 || seen.has(key)) continue;
    seen.add(key);

    concepts.push(blankConcept(label, excerpt.slice(0, 600)));
    if (concepts.length >= limit) break;
  }

  if (!concepts.length && text.trim()) {
    const excerpt = normalizeWhitespace(text).slice(0, 600);
    concepts.push(blankConcept("Core material", excerpt));
  }

  return concepts;
}

function defaultTestQuestionTypes(): TestQuestionType[] {
  return ["multiple_choice", "short_answer", "free_recall", "application"];
}

function questionType(
  session: AdaptiveStudySession,
  concept: ConceptState,
): TestQuestionType | "explain_why" {
  if (session.mode === "test") {
    const types = session.testConfig?.questionTypes.length
      ? session.testConfig.questionTypes
      : defaultTestQuestionTypes();
    return types[session.questionIndex % types.length];
  }

  if (session.mode === "quiz") {
    return concept.difficulty <= 1 ? "short_answer" : "free_recall";
  }

  if (session.mode === "review") return "free_recall";
  if (concept.difficulty <= 1) return "multiple_choice";
  if (concept.difficulty === 2) return "short_answer";
  if (concept.difficulty === 3) return "free_recall";
  return "application";
}

function overdueDays(concept: ConceptState, now = Date.now()) {
  if (!concept.nextReviewAt) return 0;
  return Math.max(0, (now - new Date(concept.nextReviewAt).getTime()) / DAY_MS);
}

function chooseConcept(session: AdaptiveStudySession) {
  const now = Date.now();
  const ordered = [...session.concepts].sort((a, b) => {
    const aDue = overdueDays(a, now);
    const bDue = overdueDays(b, now);

    const aPriority =
      (1 - a.mastery) * 0.58 +
      (a.attempts === 0 ? 0.2 : 0) +
      Math.min(a.incorrect * 0.05, 0.15) +
      Math.min(aDue * 0.08, 0.3);

    const bPriority =
      (1 - b.mastery) * 0.58 +
      (b.attempts === 0 ? 0.2 : 0) +
      Math.min(b.incorrect * 0.05, 0.15) +
      Math.min(bDue * 0.08, 0.3);

    return bPriority - aPriority;
  });

  if (session.mode === "test") {
    return ordered[session.questionIndex % ordered.length];
  }

  return ordered[0];
}

function reviewSchedule(
  performance: number,
  previousStabilityDays: number,
  now = Date.now(),
) {
  let stabilityDays: number;

  if (performance < 0.45) {
    stabilityDays = 0.25;
  } else if (performance < 0.65) {
    stabilityDays = 1;
  } else if (performance < 0.85) {
    stabilityDays = Math.max(2, previousStabilityDays * 1.8);
  } else {
    stabilityDays = Math.max(3, previousStabilityDays * 2.4);
  }

  stabilityDays = Math.min(stabilityDays, 120);

  return {
    stabilityDays: Number(stabilityDays.toFixed(2)),
    nextReviewAt: new Date(now + stabilityDays * DAY_MS).toISOString(),
  };
}

function decayedPrior(prior: ConceptState) {
  const overdue = overdueDays(prior);
  const decay = Math.min(0.3, overdue * 0.025);

  return {
    mastery: clamp(prior.mastery - decay),
    difficulty: prior.difficulty,
    stabilityDays: Math.max(0.25, prior.stabilityDays || 0.25),
    nextReviewAt: prior.nextReviewAt,
    lastSeenAt: prior.lastSeenAt,
    lastPerformance: prior.lastPerformance,
    missingConcepts: prior.missingConcepts,
  };
}

export class StudyEngine {
  private cache = new Map<string, AdaptiveStudySession>();

  constructor(
    private persistence: StudyPersistence = createStudyPersistence(),
  ) {}

  async start(
    content: ContentSession,
    options?: {
      learnerId?: string;
      mode?: StudyMode;
      targetMinutes?: number;
      maxQuestions?: number;
      testDurationMinutes?: number;
      testQuestionTypes?: TestQuestionType[];
      concepts?: Array<{ label: string; sourceExcerpt?: string }>;
    },
  ) {
    const rawText = content.contentText?.trim() ?? "";
    const concepts = options?.concepts?.length
      ? options.concepts.slice(0, 30).map((concept) =>
          blankConcept(
            concept.label.trim(),
            (concept.sourceExcerpt ?? concept.label).trim().slice(0, 600),
          ),
        )
      : deriveConcepts(rawText, 12);

    if (!concepts.length) {
      throw new Error(
        "InstantStudy could not identify study concepts. Provide extracted contentText or explicit concepts.",
      );
    }

    if (options?.learnerId) {
      const priors = await this.persistence.priorConcepts(
        options.learnerId,
        concepts.map((concept) => concept.label),
      );

      for (const concept of concepts) {
        const prior = priors.get(conceptKey(concept.label));
        if (!prior) continue;
        Object.assign(concept, decayedPrior(prior));
      }
    }

    const mode = options?.mode ?? content.mode;
    const createdAt = new Date().toISOString();
    const testDurationMinutes =
      mode === "test" ? options?.testDurationMinutes : undefined;

    const session: AdaptiveStudySession = {
      id: randomUUID(),
      contentSessionId: content.id,
      learnerId: options?.learnerId,
      title: content.title,
      mode,
      goal: content.goal,
      createdAt,
      status: "active",
      questionIndex: 0,
      maxQuestions: Math.max(1, Math.min(options?.maxQuestions ?? 12, 50)),
      targetMinutes: options?.targetMinutes,
      concepts,
      attempts: [],
      testConfig:
        mode === "test"
          ? {
              startedAt: createdAt,
              durationMinutes: testDurationMinutes,
              endsAt: testDurationMinutes
                ? new Date(Date.now() + testDurationMinutes * 60_000).toISOString()
                : undefined,
              questionTypes:
                options?.testQuestionTypes?.length
                  ? [...new Set(options.testQuestionTypes)].slice(0, 5)
                  : defaultTestQuestionTypes(),
              feedbackPolicy: "end_only",
            }
          : undefined,
    };

    this.cache.set(session.id, session);
    await this.persistence.save(session);
    return session;
  }

  async get(sessionId: string) {
    const cached = this.cache.get(sessionId);
    if (cached) return cached;

    const persisted = await this.persistence.get(sessionId);
    if (persisted) this.cache.set(sessionId, persisted);
    return persisted;
  }

  async next(sessionId: string) {
    const session = await this.requireActive(sessionId);

    const testExpired =
      session.testConfig?.endsAt &&
      Date.now() >= new Date(session.testConfig.endsAt).getTime();

    if (
      testExpired ||
      session.questionIndex >= session.maxQuestions ||
      (session.mode !== "test" &&
        session.concepts.every((concept) => concept.mastery >= 0.88))
    ) {
      return {
        done: true as const,
        reason: testExpired ? "time_expired" : "complete",
        summary: this.summary(session),
      };
    }

    const concept = chooseConcept(session);
    const type = questionType(session, concept);
    const question = generateQuestion({
      type,
      concept: {
        label: concept.label,
        sourceExcerpt: concept.sourceExcerpt,
      },
      alternatives: session.concepts
        .filter((item) => item.id !== concept.id)
        .map((item) => ({
          label: item.label,
          sourceExcerpt: item.sourceExcerpt,
        })),
      questionIndex: session.questionIndex,
      difficulty: concept.difficulty,
    });

    return {
      done: false as const,
      sessionId: session.id,
      questionIndex: session.questionIndex + 1,
      totalPlanned: session.maxQuestions,
      mode: session.mode,
      test:
        session.mode === "test"
          ? {
              endsAt: session.testConfig?.endsAt,
              durationMinutes: session.testConfig?.durationMinutes,
              feedbackPolicy: "end_only",
            }
          : undefined,
      concept: {
        id: concept.id,
        label: concept.label,
        sourceExcerpt: concept.sourceExcerpt,
        mastery: Number(concept.mastery.toFixed(2)),
        difficulty: concept.difficulty,
        nextReviewAt: concept.nextReviewAt,
      },
      question,
      questionPolicy: {
        type,
        revealAnswerBeforeAttempt: false,
        immediateFeedback: session.mode !== "test",
        guidance:
          session.mode === "learn" && concept.difficulty <= 1
            ? "recognition"
            : session.mode === "learn" && concept.difficulty === 2
              ? "light"
              : "none",
        instruction:
          session.mode === "test"
            ? `Ask exactly one ${type} exam-style question based only on the supplied source. Do not reveal hints, correctness, explanations, or the answer until the test ends.`
            : session.mode === "quiz"
              ? "Ask one concise question. After the learner answers, grade it and explain briefly."
              : session.mode === "review"
                ? "Use active recall. Prioritize due and weak concepts. Ask directly and keep the interaction fast."
                : type === "multiple_choice"
                  ? "Teach adaptively with one recognition question and plausible distractors grounded in the source. Do not reveal the answer before the attempt."
                  : type === "short_answer"
                    ? "Ask one concise written-recall question. Give only light scaffolding after an incorrect attempt."
                    : type === "free_recall"
                      ? "Ask for unaided recall in the learner's own words. Evaluate important omissions before increasing difficulty."
                      : "Ask the learner to apply the concept in a new context. If they struggle, repair the weak concept before retesting.",
      },
    };
  }

  async submit(
    sessionId: string,
    conceptId: string,
    evaluation: StudyEvaluation,
  ) {
    const session = await this.requireActive(sessionId);
    const concept = session.concepts.find((item) => item.id === conceptId);

    if (!concept) throw new Error("Concept not found in this study session.");

    const correctness = clamp(evaluation.correctness);
    const completeness = clamp(evaluation.completeness);
    const confidence = clamp(evaluation.confidence ?? 0.8);
    const performance = correctness * 0.65 + completeness * 0.35;
    const priorMastery = concept.mastery;

    concept.attempts += 1;
    concept.lastSeenAt = new Date().toISOString();
    concept.lastPerformance = Number(performance.toFixed(3));
    concept.missingConcepts = [
      ...new Set(evaluation.missingConcepts ?? []),
    ].slice(0, 10);

    if (performance >= 0.85) concept.correct += 1;
    else if (performance >= 0.5) concept.partial += 1;
    else concept.incorrect += 1;

    const learningRate = session.mode === "learn" ? 0.48 : 0.38;
    concept.mastery = clamp(
      priorMastery * (1 - learningRate) + performance * learningRate,
    );

    if (performance >= 0.82 && completeness >= 0.75) {
      concept.difficulty = Math.min(4, concept.difficulty + 1);
    } else if (performance < 0.45) {
      concept.difficulty = Math.max(1, concept.difficulty - 1);
    }

    const schedule = reviewSchedule(
      performance,
      concept.stabilityDays || 0.25,
    );
    concept.stabilityDays = schedule.stabilityDays;
    concept.nextReviewAt = schedule.nextReviewAt;

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
    const testExpired =
      session.testConfig?.endsAt &&
      Date.now() >= new Date(session.testConfig.endsAt).getTime();
    const done =
      Boolean(testExpired) ||
      session.questionIndex >= session.maxQuestions ||
      (session.mode !== "test" &&
        session.concepts.every((item) => item.mastery >= 0.88));

    await this.persistence.save(session);

    return {
      sessionId: session.id,
      activationEvent:
        session.attempts.length === 1 ? "first_answer_submitted" : undefined,
      evaluation:
        session.mode === "test"
          ? {
              recorded: true,
              suppressImmediateFeedback: true,
            }
          : {
              correctness,
              completeness,
              confidence,
              performance: Number(performance.toFixed(2)),
              needsRepair,
              suppressImmediateFeedback: false,
            },
      concept:
        session.mode === "test"
          ? {
              id: concept.id,
              label: concept.label,
              nextReviewAt: concept.nextReviewAt,
            }
          : {
              id: concept.id,
              label: concept.label,
              mastery: Number(concept.mastery.toFixed(2)),
              difficulty: concept.difficulty,
              nextReviewAt: concept.nextReviewAt,
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

  async finish(sessionId: string) {
    const session = await this.get(sessionId);
    if (!session) throw new Error("Study session not found.");

    session.status = "completed";
    session.completedAt = new Date().toISOString();
    await this.persistence.save(session);
    return this.summary(session);
  }

  async dueReviews(
    learnerId: string,
    options?: { before?: string; limit?: number },
  ): Promise<DueReview[]> {
    return this.persistence.dueReviews(
      learnerId,
      options?.before ?? new Date().toISOString(),
      Math.max(1, Math.min(options?.limit ?? 20, 100)),
    );
  }

  private async requireActive(sessionId: string) {
    const session = await this.get(sessionId);
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
        nextReviewAt: concept.nextReviewAt,
        missingConcepts: concept.missingConcepts,
      }));

    const testPerformance =
      session.mode === "test" && attempts
        ? session.attempts.reduce(
            (sum, attempt) =>
              sum + attempt.correctness * 0.65 + attempt.completeness * 0.35,
            0,
          ) / attempts
        : undefined;

    const durationSeconds = Math.max(
      0,
      Math.round(
        (new Date(session.completedAt ?? new Date().toISOString()).getTime() -
          new Date(session.createdAt).getTime()) /
          1000,
      ),
    );

    return {
      sessionId: session.id,
      learnerId: session.learnerId,
      mode: session.mode,
      attempts,
      averageMastery: Number(averageMastery.toFixed(2)),
      conceptsStudied: session.concepts.filter((concept) => concept.attempts > 0)
        .length,
      weakConcepts,
      completed:
        session.status === "completed" ||
        session.questionIndex >= session.maxQuestions,
      nextReviewAt: session.concepts
        .map((concept) => concept.nextReviewAt)
        .filter((value): value is string => Boolean(value))
        .sort()[0],
      testResult:
        session.mode === "test"
          ? {
              scorePercent: Math.round((testPerformance ?? 0) * 100),
              answered: attempts,
              totalQuestions: session.maxQuestions,
              durationSeconds,
              feedbackPolicy: "released_at_end",
              questionTypes: session.testConfig?.questionTypes,
            }
          : undefined,
    };
  }
}
