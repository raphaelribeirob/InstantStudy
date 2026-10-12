import { neon } from "@neondatabase/serverless";
import { databaseUrl, durableDatabaseRequired, DurableDatabaseRequiredError } from "./databasePolicy.js";

export type FlashcardStatus = "known" | "learning";
export type FlashcardProgress = { cardId: string; status: FlashcardStatus };
export interface FlashcardProgressStore {
  list(learnerId: string, materialId: string): Promise<FlashcardProgress[]>;
  mark(learnerId: string, materialId: string, cardId: string, status: FlashcardStatus): Promise<void>;
}

/** Development-only, in-process adapter; hosted builds always require Neon. */
export class MemoryFlashcardProgressStore implements FlashcardProgressStore {
  private rows = new Map<string, FlashcardStatus>();
  private key(learnerId: string, materialId: string, cardId: string) {
    return JSON.stringify([learnerId, materialId, cardId]);
  }
  async list(learnerId: string, materialId: string) {
    const prefix = JSON.stringify([learnerId, materialId]).slice(0, -1) + ",";
    return [...this.rows.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, status]) => ({ cardId: (JSON.parse(key) as string[])[2], status }));
  }
  async mark(learnerId: string, materialId: string, cardId: string, status: FlashcardStatus) {
    this.rows.set(this.key(learnerId, materialId, cardId), status);
  }
}

class NeonFlashcardProgressStore implements FlashcardProgressStore {
  private sql;
  private ready: Promise<void>;
  constructor(url: string) {
    this.sql = neon(url);
    this.ready = this.init();
  }
  private async init() {
    await this.sql`
      CREATE TABLE IF NOT EXISTS instantstudy_flashcard_progress (
        learner_id text NOT NULL,
        material_id uuid NOT NULL,
        card_id text NOT NULL,
        status text NOT NULL CHECK (status IN ('known', 'learning')),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (learner_id, material_id, card_id)
      )
    `;
  }
  async list(learnerId: string, materialId: string): Promise<FlashcardProgress[]> {
    await this.ready;
    const rows = await this.sql`
      SELECT card_id, status
      FROM instantstudy_flashcard_progress
      WHERE learner_id = ${learnerId} AND material_id = ${materialId}::uuid
    `;
    return rows.map(row => ({ cardId: String(row.card_id), status: row.status as FlashcardStatus }));
  }
  async mark(learnerId: string, materialId: string, cardId: string, status: FlashcardStatus) {
    await this.ready;
    await this.sql`
      INSERT INTO instantstudy_flashcard_progress (learner_id, material_id, card_id, status)
      VALUES (${learnerId}, ${materialId}::uuid, ${cardId}, ${status})
      ON CONFLICT (learner_id, material_id, card_id) DO UPDATE
        SET status = EXCLUDED.status, updated_at = now()
    `;
  }
}

class UnavailableFlashcardProgressStore implements FlashcardProgressStore {
  private fail(): never { throw new DurableDatabaseRequiredError(); }
  async list(_learnerId: string, _materialId: string): Promise<FlashcardProgress[]> { return this.fail(); }
  async mark(_learnerId: string, _materialId: string, _cardId: string, _status: FlashcardStatus): Promise<void> { return this.fail(); }
}

export function createFlashcardProgressStore(): FlashcardProgressStore {
  const url = databaseUrl();
  return url ? new NeonFlashcardProgressStore(url)
    : durableDatabaseRequired() ? new UnavailableFlashcardProgressStore()
    : new MemoryFlashcardProgressStore();
}
export const flashcardProgressStore = createFlashcardProgressStore();
