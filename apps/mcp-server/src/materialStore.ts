import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { StudyAssets } from "./studyAssets.js";

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

export interface MaterialStore {
  save(input: Omit<StudyMaterial, "id" | "createdAt" | "updatedAt">): Promise<StudyMaterial>;
  list(learnerId: string, query?: string, limit?: number): Promise<StudyMaterial[]>;
  get(learnerId: string, id: string): Promise<StudyMaterial | null>;
}

export class MemoryMaterialStore implements MaterialStore {
  private rows = new Map<string, StudyMaterial>();

  async save(input: Omit<StudyMaterial, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    const row: StudyMaterial = {
      ...structuredClone(input),
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.rows.set(row.id, row);
    return structuredClone(row);
  }

  async list(learnerId: string, query = "", limit = 100) {
    const needle = query.trim().toLocaleLowerCase();
    return [...this.rows.values()]
      .filter((row) => row.learnerId === learnerId)
      .filter((row) =>
        !needle ||
        row.title.toLocaleLowerCase().includes(needle) ||
        row.content.toLocaleLowerCase().includes(needle),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map((row) => structuredClone(row));
  }

  async get(learnerId: string, id: string) {
    const row = this.rows.get(id);
    if (!row || row.learnerId !== learnerId) return null;
    return structuredClone(row);
  }
}

class NeonMaterialStore implements MaterialStore {
  private sql;
  private ready: Promise<void>;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
    this.ready = this.init();
  }

  private async init() {
    await this.sql`
      CREATE TABLE IF NOT EXISTS instantstudy_materials (
        id uuid PRIMARY KEY,
        learner_id text NOT NULL,
        title text NOT NULL,
        content text NOT NULL,
        source_type text NOT NULL,
        source_names jsonb NOT NULL DEFAULT '[]'::jsonb,
        assets_json jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await this.sql`
      CREATE INDEX IF NOT EXISTS instantstudy_materials_learner_updated_idx
      ON instantstudy_materials (learner_id, updated_at DESC)
    `;
  }

  async save(input: Omit<StudyMaterial, "id" | "createdAt" | "updatedAt">) {
    await this.ready;
    const id = randomUUID();
    const sourceNames = JSON.stringify(input.sourceNames);
    const assets = JSON.stringify(input.assets);

    const rows = await this.sql`
      INSERT INTO instantstudy_materials (
        id, learner_id, title, content, source_type, source_names, assets_json
      )
      VALUES (
        ${id}::uuid,
        ${input.learnerId},
        ${input.title},
        ${input.content},
        ${input.sourceType},
        ${sourceNames}::jsonb,
        ${assets}::jsonb
      )
      RETURNING
        id::text,
        learner_id,
        title,
        content,
        source_type,
        source_names,
        assets_json,
        created_at,
        updated_at
    `;

    return this.row(rows[0]);
  }

  async list(learnerId: string, query = "", limit = 100) {
    await this.ready;
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const needle = `%${query.trim()}%`;

    const rows = query.trim()
      ? await this.sql`
          SELECT id::text, learner_id, title, content, source_type, source_names,
                 assets_json, created_at, updated_at
          FROM instantstudy_materials
          WHERE learner_id = ${learnerId}
            AND (title ILIKE ${needle} OR content ILIKE ${needle})
          ORDER BY updated_at DESC
          LIMIT ${safeLimit}
        `
      : await this.sql`
          SELECT id::text, learner_id, title, content, source_type, source_names,
                 assets_json, created_at, updated_at
          FROM instantstudy_materials
          WHERE learner_id = ${learnerId}
          ORDER BY updated_at DESC
          LIMIT ${safeLimit}
        `;

    return rows.map((row) => this.row(row));
  }

  async get(learnerId: string, id: string) {
    await this.ready;
    const rows = await this.sql`
      SELECT id::text, learner_id, title, content, source_type, source_names,
             assets_json, created_at, updated_at
      FROM instantstudy_materials
      WHERE learner_id = ${learnerId}
        AND id = ${id}::uuid
      LIMIT 1
    `;

    return rows[0] ? this.row(rows[0]) : null;
  }

  private row(row: Record<string, unknown>): StudyMaterial {
    return {
      id: String(row.id),
      learnerId: String(row.learner_id),
      title: String(row.title),
      content: String(row.content),
      sourceType: String(row.source_type) as StudyMaterial["sourceType"],
      sourceNames: Array.isArray(row.source_names)
        ? row.source_names.map(String)
        : [],
      assets: row.assets_json as StudyAssets,
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    };
  }
}

export function createMaterialStore(): MaterialStore {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  return databaseUrl
    ? new NeonMaterialStore(databaseUrl)
    : new MemoryMaterialStore();
}

export const materialStore = createMaterialStore();
