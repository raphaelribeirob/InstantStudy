import { neon } from "@neondatabase/serverless";
import {
  databaseUrl,
  durableDatabaseRequired,
  DurableDatabaseRequiredError,
} from "./databasePolicy.js";
import type { AdaptiveStudySession, ConceptState } from "./studyEngine.js";

export type DueReview = {
  sessionId: string;
  materialId?: string;
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
  recentSessions(
    learnerId: string,
    limit: number,
  ): Promise<AdaptiveStudySession[]>;
}

function key(label: string) {
  return label.trim().toLocaleLowerCase();
}

/** Project current attempted concepts into an indexed queue. Never generate
 * a due item for unattempted or undated concepts. Deduplicate repeated labels.
 * The material and owner remain bound to the parent study session.
 */
export function indexedProgressRows(session: AdaptiveStudySession) {
  const rows = new Map<string, {
    concept_key: string;
    concept_id: string;
    label: string;
    source_excerpt: string;
    mastery: number;
    difficulty: number;
    last_seen_at: string;
    next_review_at: string;
    missing_concepts: string[];
    concept_json: ConceptState;
  }>();
  for (const concept of session.concepts) {
    if (!concept.lastSeenAt || !concept.nextReviewAt) continue;
    const normalized = key(concept.label);
    if (!normalized) continue;
    const prior = rows.get(normalized);
    if (prior && prior.last_seen_at > concept.lastSeenAt) continue;
    rows.set(normalized, {
      concept_key: normalized,
      concept_id: concept.id,
      label: concept.label,
      source_excerpt: concept.sourceExcerpt,
      mastery: concept.mastery,
      difficulty: concept.difficulty,
      last_seen_at: concept.lastSeenAt,
      next_review_at: concept.nextReviewAt,
      missing_concepts: concept.missingConcepts,
      concept_json: concept,
    });
  }
  return [...rows.values()];
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
          materialId: session.materialId,
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
  async recentSessions(learnerId: string, limit: number) {
    return [...this.sessions.values()]
      .filter((session) => session.learnerId === learnerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, Math.max(1, Math.min(limit, 200)))
      .map((session) => structuredClone(session));
  }
}

class NeonStudyPersistence implements StudyPersistence {
  private sql;
  private ready: Promise<void>;
  // Off until schema + historical backfill have been verified on a Neon
  // preview branch. Enabling without the migration fails, not a silent bypass.
  private readonly indexedReview =
    process.env.INSTANTSTUDY_INDEXED_REVIEW_ENABLED === "true";

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
    const write = this.sql`
      INSERT INTO instantstudy_sessions (
        id, learner_id, status, mode, title, updated_at, session_json
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

    if (!this.indexedReview || !session.learnerId) {
      await write;
      return;
    }

    const rows = indexedProgressRows(session);
    if (!rows.length) {
      await write;
      return;
    }
    const payload = JSON.stringify(rows);
    const indexed = this.sql`
      INSERT INTO instantstudy_concept_progress (
        learner_id, concept_key, session_id, material_id, title,
        concept_id, label, source_excerpt, mastery, difficulty,
        last_seen_at, next_review_at, missing_concepts, concept_json
      )
      SELECT
        ${session.learnerId},
        p.concept_key,
        ${session.id}::uuid,
        ${session.materialId ?? null}::uuid,
        ${session.title},
        p.concept_id, p.label, p.source_excerpt, p.mastery, p.difficulty,
        p.last_seen_at, p.next_review_at, p.missing_concepts, p.concept_json
      FROM jsonb_to_recordset(${payload}::jsonb) AS p (
        concept_key text, concept_id text, label text,
        source_excerpt text, mastery float8, difficulty float8,
        last_seen_at timestamptz, next_review_at timestamptz,
        missing_concepts jsonb, concept_json jsonb
      )
      ON CONFLICT (learner_id, concept_key) DO UPDATE
      SET session_id = EXCLUDED.session_id,
          material_id = EXCLUDED.material_id,
          title = EXCLUDED.title,
          concept_id = EXCLUDED.concept_id,
          label = EXCLUDED.label,
          source_excerpt = EXCLUDED.source_excerpt,
          mastery = EXCLUDED.mastery,
          difficulty = EXCLUDED.difficulty,
          last_seen_at = EXCLUDED.last_seen_at,
          next_review_at = EXCLUDED.next_review_at,
          missing_concepts = EXCLUDED.missing_concepts,
          concept_json = EXCLUDED.concept_json,
          updated_at = now()
      WHERE instantstudy_concept_progress.last_seen_at <= EXCLUDED.last_seen_at
    `;
    // The session and indexed due queue must be committed together.
    await this.sql.transaction([write, indexed]);
  }

  async recentSessions(learnerId: string, limit = 100) {
    await this.ready;
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const rows = await this.sql`
      SELECT session_json
      FROM instantstudy_sessions
      WHERE learner_id = ${learnerId}
      ORDER BY updated_at DESC
      LIMIT ${safeLimit}
    `;

    return rows
      .map((row) => row.session_json as AdaptiveStudySession)
      .filter(Boolean);
  }

  async priorConcepts(learnerId: string, labels: string[]) {
    if (this.indexedReview) {
      await this.ready;
      const wanted = [...new Set(labels.map(key).filter(Boolean))];
      const result = new Map<string, ConceptState>();
      if (!wanted.length) return result;
      const rows = await this.sql`
        SELECT concept_key, concept_json
        FROM instantstudy_concept_progress
        WHERE learner_id = ${learnerId}
          AND concept_key IN (
            SELECT jsonb_array_elements_text(${JSON.stringify(wanted)}::jsonb)
          )
      `;
      for (const row of rows) result.set(String(row.concept_key), row.concept_json as ConceptState);
      return result;
    }
    const sessions = await this.recentSessions(learnerId, 100);
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
    if (this.indexedReview) {
      await this.ready;
      const safeLimit = Math.max(1, Math.min(limit, 200));
      const rows = await this.sql`
        SELECT session_id::text, material_id::text, title, concept_id,
               label, source_excerpt, mastery, difficulty,
               next_review_at, missing_concepts
        FROM instantstudy_concept_progress
        WHERE learner_id = ${learnerId}
          AND next_review_at <= ${beforeIso}::timestamptz
        ORDER BY next_review_at ASC, concept_key ASC
        LIMIT ${safeLimit}
      `;
      return rows.map(row => ({
        sessionId: String(row.session_id),
        materialId: row.material_id ? String(row.material_id) : undefined,
        title: String(row.title),
        conceptId: String(row.concept_id),
        label: String(row.label),
        sourceExcerpt: String(row.source_excerpt),
        mastery: Number(row.mastery),
        difficulty: Number(row.difficulty),
        nextReviewAt: new Date(String(row.next_review_at)).toISOString(),
        missingConcepts: row.missing_concepts as string[],
      }));
    }
    const sessions = await this.recentSessions(learnerId, 100);
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
          materialId: session.materialId,
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

class UnavailableStudyPersistence implements StudyPersistence {
  private unavailable(): never {
    throw new DurableDatabaseRequiredError();
  }

  async get(_sessionId: string) {
    return this.unavailable();
  }

  async save(_session: AdaptiveStudySession) {
    return this.unavailable();
  }

  async priorConcepts(_learnerId: string, _labels: string[]) {
    return this.unavailable();
  }

  async dueReviews(_learnerId: string, _beforeIso: string, _limit: number) {
    return this.unavailable();
  }

  async recentSessions(_learnerId: string, _limit: number) {
    return this.unavailable();
  }
}

export function createStudyPersistence(): StudyPersistence {
  const url = databaseUrl();

  if (url) {
    return new NeonStudyPersistence(url);
  }

  return durableDatabaseRequired()
    ? new UnavailableStudyPersistence()
    : new MemoryStudyPersistence();
}
