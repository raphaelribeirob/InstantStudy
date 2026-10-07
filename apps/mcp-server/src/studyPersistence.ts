import { neon } from "@neondatabase/serverless";
import type { AdaptiveStudySession, ConceptState } from "./studyEngine.js";

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

export interface StudyPersistence {
  get(sessionId: string): Promise<AdaptiveStudySession | null>;
  save(session: AdaptiveStudySession): Promise<void>;
  priorConcepts(
    learnerId: string,
    labels: string[],
  ): Promise<Map<string, ConceptState>>;
  dueReviews(
    learnerId: string,
    beforeIso: string,
    limit: number,
  ): Promise<DueReview[]>;
}

function key(label: string) {
  return label.trim().toLocaleLowerCase();
}

class MemoryStudyPersistence implements StudyPersistence {
  private sessions = new Map<string, AdaptiveStudySession>();

  async get(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  async save(session: AdaptiveStudySession) {
    this.sessions.set(session.id, structuredClone(session));
  }

  async priorConcepts(learnerId: string, labels: string[]) {
    const wanted = new Set(labels.map(key));
    const result = new Map<string, ConceptState>();

    for (const session of [...this.sessions.values()].reverse()) {
      if (session.learnerId !== learnerId) continue;
      for (const concept of session.concepts) {
        const normalized = key(concept.label);
        if (wanted.has(normalized) && !result.has(normalized)) {
          result.set(normalized, structuredClone(concept));
        }
      }
    }

    return result;
  }

  async dueReviews(learnerId: string, beforeIso: string, limit: number) {
    const before = new Date(beforeIso).getTime();
    const seen = new Set<string>();
    const due: DueReview[] = [];

    for (const session of [...this.sessions.values()].reverse()) {
      if (session.learnerId !== learnerId) continue;

      for (const concept of session.concepts) {
        if (!concept.nextReviewAt) continue;
        if (new Date(concept.nextReviewAt).getTime() > before) continue;

        const normalized = key(concept.label);
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        due.push({
          sessionId: session.id,
          title: session.title,
          conceptId: concept.id,
          label: concept.label,
          sourceExcerpt: concept.sourceExcerpt,
          mastery: concept.mastery,
          difficulty: concept.difficulty,
          nextReviewAt: concept.nextReviewAt,
          missingConcepts: concept.missingConcepts,
        });
      }
    }

    return due
      .sort(
        (a, b) =>
          new Date(a.nextReviewAt).getTime() -
          new Date(b.nextReviewAt).getTime(),
      )
      .slice(0, limit);
  }
}

class NeonStudyPersistence implements StudyPersistence {
  private sql;
  private ready: Promise<void>;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
    this.ready = this.init();
  }

  private async init() {
    await this.sql`
      CREATE TABLE IF NOT EXISTS instantstudy_sessions (
        id uuid PRIMARY KEY,
        learner_id text,
        status text NOT NULL,
        mode text NOT NULL,
        title text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        session_json jsonb NOT NULL
      )
    `;

    await this.sql`
      CREATE INDEX IF NOT EXISTS instantstudy_sessions_learner_updated_idx
      ON instantstudy_sessions (learner_id, updated_at DESC)
    `;
  }

  async get(sessionId: string) {
    await this.ready;
    const rows = await this.sql`
      SELECT session_json
      FROM instantstudy_sessions
      WHERE id = ${sessionId}::uuid
      LIMIT 1
    `;

    return (rows[0]?.session_json as AdaptiveStudySession | undefined) ?? null;
  }

  async save(session: AdaptiveStudySession) {
    await this.ready;
    const serialized = JSON.stringify(session);

    await this.sql`
      INSERT INTO instantstudy_sessions (
        id,
        learner_id,
        status,
        mode,
        title,
        updated_at,
        session_json
      )
      VALUES (
        ${session.id}::uuid,
        ${session.learnerId ?? null},
        ${session.status},
        ${session.mode},
        ${session.title},
        now(),
        ${serialized}::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET
        learner_id = EXCLUDED.learner_id,
        status = EXCLUDED.status,
        mode = EXCLUDED.mode,
        title = EXCLUDED.title,
        updated_at = now(),
        session_json = EXCLUDED.session_json
    `;
  }

  private async recentSessions(learnerId: string) {
    await this.ready;
    const rows = await this.sql`
      SELECT session_json
      FROM instantstudy_sessions
      WHERE learner_id = ${learnerId}
      ORDER BY updated_at DESC
      LIMIT 100
    `;

    return rows
      .map((row) => row.session_json as AdaptiveStudySession)
      .filter(Boolean);
  }

  async priorConcepts(learnerId: string, labels: string[]) {
    const sessions = await this.recentSessions(learnerId);
    const wanted = new Set(labels.map(key));
    const result = new Map<string, ConceptState>();

    for (const session of sessions) {
      for (const concept of session.concepts) {
        const normalized = key(concept.label);
        if (wanted.has(normalized) && !result.has(normalized)) {
          result.set(normalized, concept);
        }
      }
    }

    return result;
  }

  async dueReviews(learnerId: string, beforeIso: string, limit: number) {
    const sessions = await this.recentSessions(learnerId);
    const before = new Date(beforeIso).getTime();
    const seen = new Set<string>();
    const due: DueReview[] = [];

    for (const session of sessions) {
      for (const concept of session.concepts) {
        if (!concept.nextReviewAt) continue;
        if (new Date(concept.nextReviewAt).getTime() > before) continue;

        const normalized = key(concept.label);
        if (seen.has(normalized)) continue;
        seen.add(normalized);

        due.push({
          sessionId: session.id,
          title: session.title,
          conceptId: concept.id,
          label: concept.label,
          sourceExcerpt: concept.sourceExcerpt,
          mastery: concept.mastery,
          difficulty: concept.difficulty,
          nextReviewAt: concept.nextReviewAt,
          missingConcepts: concept.missingConcepts,
        });
      }
    }

    return due
      .sort(
        (a, b) =>
          new Date(a.nextReviewAt).getTime() -
          new Date(b.nextReviewAt).getTime(),
      )
      .slice(0, limit);
  }
}

export function createStudyPersistence(): StudyPersistence {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return new NeonStudyPersistence(databaseUrl);
  }

  return new MemoryStudyPersistence();
}
