import { schemaManagedExternally } from "./databasePolicy.js";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import {
  databaseUrl,
  durableDatabaseRequired,
  DurableDatabaseRequiredError,
} from "./databasePolicy.js";
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

export type MaterialSummary = Omit<StudyMaterial, "content" | "assets">;
export type MaterialCursor = { updatedAt: string; id: string };
export type MaterialSummaryPage = { materials: MaterialSummary[]; nextCursor: MaterialCursor | null };

function summary(material: StudyMaterial): MaterialSummary {
  const { content: _content, assets: _assets, ...rest } = material;
  return rest;
}

export interface MaterialStore {
  listSummaries(learnerId: string, query?: string, limit?: number,
    cursor?: MaterialCursor): Promise<MaterialSummaryPage>;
  save(input: Omit<StudyMaterial, "id" | "createdAt" | "updatedAt">): Promise<StudyMaterial>;
  list(learnerId: string, query?: string, limit?: number): Promise<StudyMaterial[]>;
  get(learnerId: string, id: string): Promise<StudyMaterial | null>;
  update(learnerId: string, id: string, changes: { title: string; assets: StudyAssets }): Promise<StudyMaterial | null>;
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

  async listSummaries(learnerId: string, query = "", limit = 30,
    cursor?: MaterialCursor): Promise<MaterialSummaryPage> {
    const max = Math.max(1, Math.min(limit, 50));
    const needle = query.trim().toLocaleLowerCase();
    const sorted = [...this.rows.values()].filter(row => row.learnerId === learnerId &&
      (!needle || row.title.toLocaleLowerCase().includes(needle)))
      .sort((a,b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id))
      .filter(row => !cursor || row.updatedAt < cursor.updatedAt ||
        (row.updatedAt === cursor.updatedAt && row.id < cursor.id));
    const page = sorted.slice(0,max);
    const last = page.at(-1);
    return { materials: page.map(row=>summary(structuredClone(row))),
      nextCursor: sorted.length > max && last ?
        {updatedAt: last.updatedAt, id: last.id} : null };
  }

  async get(learnerId: string, id: string) {
    const row = this.rows.get(id);
    if (!row || row.learnerId !== learnerId) return null;
    return structuredClone(row);
  } 
  async update(learnerId: string, id: string, changes: { title: string; assets: StudyAssets }) {
    const existing = this.rows.get(id);
    if (!existing || existing.learnerId !== learnerId) return null;
    const updated: StudyMaterial = {
      ...existing,
      title: changes.title,
      assets: structuredClone(changes.assets),
      updatedAt: new Date().toISOString(),
    };
    this.rows.set(id, updated);
    return structuredClone(updated);
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
    if (schemaManagedExternally()) return;
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

  async listSummaries(learnerId: string, query = "", limit = 30,
    cursor?: MaterialCursor): Promise<MaterialSummaryPage> {
    await this.ready;
    const max = Math.max(1, Math.min(limit, 50));
    const needle = `%${query.trim()}%`;
    const afterTime = cursor?.updatedAt ?? null;
    const afterId = cursor?.id ?? null;
    const rows = await this.sql`
      SELECT id::text, learner_id, title, source_type, source_names,
             created_at, updated_at
      FROM instantstudy_materials
      WHERE learner_id = ${learnerId}
        AND title ILIKE ${needle}
        AND (${afterTime}::timestamptz IS NULL OR
          (updated_at,id) < (${afterTime}::timestamptz,${afterId}::uuid))
      ORDER BY updated_at DESC, id DESC
      LIMIT ${max + 1}
    `;
    const page = rows.slice(0,max).map(row => ({
      id: String(row.id),
      learnerId: String(row.learner_id),
      title: String(row.title),
      sourceType: String(row.source_type) as StudyMaterial["sourceType"],
      sourceNames: Array.isArray(row.source_names) ? row.source_names.map(String) : [],
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    }));
    const last = page.at(-1);
    return {materials: page,
      nextCursor: rows.length > max && last ?
        {updatedAt:last.updatedAt, id:last.id}: null };
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

  async update(learnerId: string, id: string, changes: { title: string; assets: StudyAssets }) {
    await this.ready;
    const assets = JSON.stringify(changes.assets);
    const rows = await this.sql`
      UPDATE instantstudy_materials
      SET title = ${changes.title},
          assets_json = ${assets}::jsonb,
          updated_at = now()
      WHERE learner_id = ${learnerId}
        AND id = ${id}::uuid
      RETURNING id::text, learner_id, title, content, source_type,
                source_names, assets_json, created_at, updated_at
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

class UnavailableMaterialStore implements MaterialStore {
  private unavailable(): never {
    throw new DurableDatabaseRequiredError();
  }

  async save(_input: Omit<StudyMaterial, "id" | "createdAt" | "updatedAt">) {
    return this.unavailable();
  }

  async list(_learnerId: string, _query = "", _limit = 100) {
    return this.unavailable();
  }

  async listSummaries(_learnerId: string, _query = "", _limit = 30,
    _cursor?: MaterialCursor): Promise<MaterialSummaryPage> {
    return this.unavailable();
  }
  async get(_learnerId: string, _id: string) {
    return this.unavailable();
  }
  async update(_learnerId: string, _id: string, _changes: { title: string; assets: StudyAssets }) {
    return this.unavailable();
  }
}

export function createMaterialStore(): MaterialStore {
  const url = databaseUrl();
  if (url) return new NeonMaterialStore(url);

  return durableDatabaseRequired()
    ? new UnavailableMaterialStore()
    : new MemoryMaterialStore();
}

export const materialStore = createMaterialStore();
