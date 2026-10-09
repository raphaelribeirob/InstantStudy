import type { AdaptiveStudySession } from "./studyEngine.js";
import type { StudyAssets } from "./studyAssets.js";

export type InsightConcept = {
  label: string;
  mastery: number;
  attempts: number;
  nextReviewAt?: string;
};

export type RetentionInsights = {
  sessions: number;
  completedSessions: number;
  attempts: number;
  minutesStudied: number;
  averageMastery: number;
  retentionScore: number | null;
  delayedReviewAttempts: number;
  dueNow: number;
  streakDays: number;
  activity7d: Array<{ date: string; attempts: number; minutes: number }>;
  strongConcepts: InsightConcept[];
  weakConcepts: InsightConcept[];
  charms: Array<{
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
  }>;
};

function dayKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

function durationMinutes(session: AdaptiveStudySession) {
  const end = new Date(session.completedAt ?? new Date().toISOString()).getTime();
  const start = new Date(session.createdAt).getTime();
  if (!Number.isFinite(end) || !Number.isFinite(start) || end < start) return 0;
  return Math.min(24 * 60, Math.max(0, Math.round((end - start) / 60_000)));
}

function consecutiveStudyDays(sessions: AdaptiveStudySession[]) {
  const days = new Set(sessions.map((session) => dayKey(session.createdAt)));
  let streak = 0;
  const cursor = new Date();

  for (;;) {
    const key = dayKey(cursor);
    if (!days.has(key)) {
      if (streak === 0) {
        cursor.setUTCDate(cursor.getUTCDate() - 1);
        if (days.has(dayKey(cursor))) {
          streak += 1;
          cursor.setUTCDate(cursor.getUTCDate() - 1);
          continue;
        }
      }
      break;
    }

    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export function buildRetentionInsights(
  sessions: AdaptiveStudySession[],
  now = new Date(),
): RetentionInsights {
  const attempts = sessions.reduce((sum, session) => sum + session.attempts.length, 0);
  const completedSessions = sessions.filter((session) => session.status === "completed").length;
  const minutesStudied = sessions.reduce((sum, session) => sum + durationMinutes(session), 0);
  const concepts = sessions.flatMap((session) => session.concepts);
  const conceptMap = new Map<string, InsightConcept>();

  for (const concept of concepts) {
    const key = concept.label.trim().toLocaleLowerCase();
    const current = conceptMap.get(key);
    if (!current || concept.attempts > current.attempts || concept.mastery > current.mastery) {
      conceptMap.set(key, {
        label: concept.label,
        mastery: Number(concept.mastery.toFixed(2)),
        attempts: concept.attempts,
        nextReviewAt: concept.nextReviewAt,
      });
    }
  }

  const latestConcepts = [...conceptMap.values()];
  const averageMastery = latestConcepts.length
    ? latestConcepts.reduce((sum, concept) => sum + concept.mastery, 0) / latestConcepts.length
    : 0;

  const nowMs = now.getTime();
  const dueNow = latestConcepts.filter(
    (concept) =>
      concept.nextReviewAt &&
      new Date(concept.nextReviewAt).getTime() <= nowMs,
  ).length;

  // Observe recall ONLY when a concept is retested on a later calendar day.
  // Mastery is a separate estimate; it must not be labeled as retention.
  const firstEncounter = new Map<string, string>();
  let delayedReviewAttempts = 0;
  let delayedCorrectAttempts = 0;
  const chronologically = [...sessions].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const session of chronologically) {
    for (const attempt of [...session.attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const concept = session.concepts.find((item) => item.id === attempt.conceptId);
      if (!concept) continue;
      const conceptKey = concept.label.trim().toLocaleLowerCase();
      const day = dayKey(attempt.createdAt);
      const originalDay = firstEncounter.get(conceptKey);
      if (!originalDay) {
        firstEncounter.set(conceptKey, day);
      } else if (day > originalDay) {
        delayedReviewAttempts += 1;
        if (attempt.correctness >= 0.8 && attempt.completeness >= 0.7) {
          delayedCorrectAttempts += 1;
        }
      }
    }
  }
  const retentionScore = delayedReviewAttempts
    ? Number((delayedCorrectAttempts / delayedReviewAttempts).toFixed(2))
    : null;

  const activity7d = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const key = dayKey(date);
    const matching = sessions.filter((session) => dayKey(session.createdAt) === key);

    return {
      date: key,
      attempts: matching.reduce((sum, session) => sum + session.attempts.length, 0),
      minutes: matching.reduce((sum, session) => sum + durationMinutes(session), 0),
    };
  });

  const ordered = [...latestConcepts].sort((a, b) => b.mastery - a.mastery);
  const strongConcepts = ordered.filter((concept) => concept.mastery >= 0.75).slice(0, 5);
  const weakConcepts = [...ordered].reverse().filter((concept) => concept.mastery < 0.75).slice(0, 5);
  const streakDays = consecutiveStudyDays(sessions);

  return {
    sessions: sessions.length,
    completedSessions,
    attempts,
    minutesStudied,
    averageMastery: Number(averageMastery.toFixed(2)),
    retentionScore,
    delayedReviewAttempts,
    dueNow,
    streakDays,
    activity7d,
    strongConcepts,
    weakConcepts,
    charms: [
      {
        id: "first-session",
        title: "First Step",
        description: "Complete your first study session.",
        unlocked: completedSessions >= 1,
      },
      {
        id: "streak-3",
        title: "Momentum",
        description: "Study on 3 consecutive days.",
        unlocked: streakDays >= 3,
      },
      {
        id: "attempts-50",
        title: "Active Recall",
        description: "Submit 50 study answers.",
        unlocked: attempts >= 50,
      },
      {
        id: "mastery-80",
        title: "Mastery",
        description: "Reach 80% average mastery.",
        unlocked: averageMastery >= 0.8 && latestConcepts.length >= 3,
      },
    ],
  };
}

export type AudioStudySegment = {
  speaker: "Host" | "Coach";
  text: string;
};

export type StudyGameCard = {
  id: string;
  pairId: string;
  kind: "prompt" | "answer";
  text: string;
};

export type StudyGame = {
  title: string;
  cards: StudyGameCard[];
  pairCount: number;
  generatedBy: "deterministic";
};

function hashText(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededOrder<T>(items: T[], seed: number) {
  const copy = [...items];
  let state = seed || 1;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

export function buildStudyGame(title: string, assets: StudyAssets): StudyGame {
  const pairs = assets.flashcards
    .filter((card) => card.front.trim() && card.back.trim())
    .slice(0, 6);

  const cards = pairs.flatMap((card, index) => {
    const pairId = card.id || `pair-${index + 1}`;
    return [
      {
        id: `${pairId}-prompt`,
        pairId,
        kind: "prompt" as const,
        text: card.front,
      },
      {
        id: `${pairId}-answer`,
        pairId,
        kind: "answer" as const,
        text: card.back,
      },
    ];
  });

  return {
    title,
    cards: seededOrder(cards, hashText(title + cards.map((card) => card.text).join("|"))),
    pairCount: pairs.length,
    generatedBy: "deterministic",
  };
}

export type AudioStudy = {
  title: string;
  estimatedMinutes: number;
  segments: AudioStudySegment[];
};

function sentence(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/[.!?]*$/, ".");
}

export function buildAudioStudy(
  title: string,
  assets: StudyAssets,
): AudioStudy {
  const outline = assets.outline.slice(0, 6);
  const concepts = assets.keyConcepts.slice(0, 8);
  const segments: AudioStudySegment[] = [
    {
      speaker: "Host",
      text: `Welcome to InstantStudy Podcast. Today we are unpacking ${title} into the ideas you need to remember.`,
    },
    {
      speaker: "Host",
      text: `Start with the big picture: ${sentence(assets.summary)}`,
    },
  ];

  for (let index = 0; index < outline.length; index += 1) {
    const concept = concepts[index] ?? `idea ${index + 1}`;
    segments.push({
      speaker: "Host",
      text: `Key idea ${index + 1}: ${sentence(outline[index])}`,
    });
    segments.push({
      speaker: "Coach",
      text: `Let me challenge that. Before we move on, what would you say is the essential point about ${concept}? Pause and answer it out loud.`,
    });
  }

  segments.push({
    speaker: "Host",
    text: "Finish by explaining the topic in your own words without looking at your notes. Anything you cannot explain should go back into Review.",
  });

  const words = segments.reduce(
    (sum, segment) => sum + segment.text.split(/\s+/).filter(Boolean).length,
    0,
  );

  return {
    title,
    estimatedMinutes: Math.max(1, Math.ceil(words / 145)),
    segments,
  };
}
