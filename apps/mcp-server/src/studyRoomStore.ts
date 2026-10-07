import { randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import {
  databaseUrl,
  durableDatabaseRequired,
  DurableDatabaseRequiredError,
} from "./databasePolicy.js";

export type StudyRoomMember = {
  learnerId: string;
  displayName: string;
  joinedAt: string;
  progress: number;
  attempts: number;
};

export type StudyRoom = {
  id: string;
  code: string;
  hostLearnerId: string;
  title: string;
  materialId?: string;
  summary: string;
  concepts: string[];
  createdAt: string;
  updatedAt: string;
  members: StudyRoomMember[];
};

export interface StudyRoomStore {
  create(input: {
    hostLearnerId: string;
    displayName: string;
    title: string;
    materialId?: string;
    summary: string;
    concepts: string[];
  }): Promise<StudyRoom>;
  join(input: {
    code: string;
    learnerId: string;
    displayName: string;
  }): Promise<StudyRoom | null>;
  get(code: string): Promise<StudyRoom | null>;
  progress(input: {
    code: string;
    learnerId: string;
    progress: number;
    attempts: number;
  }): Promise<StudyRoom | null>;
}

function roomCode() {
  return randomBytes(5)
    .toString("base64url")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
    .padEnd(6, "X");
}

export class MemoryStudyRoomStore implements StudyRoomStore {
  private rooms = new Map<string, StudyRoom>();

  async create(input: {
    hostLearnerId: string;
    displayName: string;
    title: string;
    materialId?: string;
    summary: string;
    concepts: string[];
  }) {
    const now = new Date().toISOString();
    const room: StudyRoom = {
      id: randomUUID(),
      code: roomCode(),
      hostLearnerId: input.hostLearnerId,
      title: input.title,
      materialId: input.materialId,
      summary: input.summary,
      concepts: input.concepts.slice(0, 20),
      createdAt: now,
      updatedAt: now,
      members: [
        {
          learnerId: input.hostLearnerId,
          displayName: input.displayName,
          joinedAt: now,
          progress: 0,
          attempts: 0,
        },
      ],
    };
    this.rooms.set(room.code, room);
    return structuredClone(room);
  }

  async join(input: { code: string; learnerId: string; displayName: string }) {
    const room = this.rooms.get(input.code.toUpperCase());
    if (!room) return null;
    const existing = room.members.find((member) => member.learnerId === input.learnerId);
    if (!existing) {
      room.members.push({
        learnerId: input.learnerId,
        displayName: input.displayName,
        joinedAt: new Date().toISOString(),
        progress: 0,
        attempts: 0,
      });
    } else {
      existing.displayName = input.displayName;
    }
    room.updatedAt = new Date().toISOString();
    return structuredClone(room);
  }

  async get(code: string) {
    const room = this.rooms.get(code.toUpperCase());
    return room ? structuredClone(room) : null;
  }

  async progress(input: {
    code: string;
    learnerId: string;
    progress: number;
    attempts: number;
  }) {
    const room = this.rooms.get(input.code.toUpperCase());
    if (!room) return null;
    const member = room.members.find((item) => item.learnerId === input.learnerId);
    if (!member) return null;
    member.progress = Math.max(0, Math.min(1, input.progress));
    member.attempts = Math.max(0, input.attempts);
    room.updatedAt = new Date().toISOString();
    return structuredClone(room);
  }
}

class NeonStudyRoomStore implements StudyRoomStore {
  private sql;
  private ready: Promise<void>;

  constructor(url: string) {
    this.sql = neon(url);
    this.ready = this.init();
  }

  private async init() {
    await this.sql`
      CREATE TABLE IF NOT EXISTS instantstudy_rooms (
        id uuid PRIMARY KEY,
        code text UNIQUE NOT NULL,
        host_learner_id text NOT NULL,
        title text NOT NULL,
        material_id uuid,
        summary text NOT NULL,
        concepts_json jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await this.sql`
      CREATE TABLE IF NOT EXISTS instantstudy_room_members (
        room_id uuid NOT NULL REFERENCES instantstudy_rooms(id) ON DELETE CASCADE,
        learner_id text NOT NULL,
        display_name text NOT NULL,
        joined_at timestamptz NOT NULL DEFAULT now(),
        progress double precision NOT NULL DEFAULT 0,
        attempts integer NOT NULL DEFAULT 0,
        PRIMARY KEY (room_id, learner_id)
      )
    `;
  }

  private async hydrate(code: string): Promise<StudyRoom | null> {
    await this.ready;
    const rooms = await this.sql`
      SELECT id::text, code, host_learner_id, title, material_id::text,
             summary, concepts_json, created_at, updated_at
      FROM instantstudy_rooms
      WHERE code = ${code.toUpperCase()}
      LIMIT 1
    `;
    if (!rooms[0]) return null;
    const row = rooms[0];

    const members = await this.sql`
      SELECT learner_id, display_name, joined_at, progress, attempts
      FROM instantstudy_room_members
      WHERE room_id = ${String(row.id)}::uuid
      ORDER BY joined_at ASC
    `;

    return {
      id: String(row.id),
      code: String(row.code),
      hostLearnerId: String(row.host_learner_id),
      title: String(row.title),
      materialId: row.material_id ? String(row.material_id) : undefined,
      summary: String(row.summary),
      concepts: Array.isArray(row.concepts_json)
        ? row.concepts_json.map(String)
        : [],
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
      members: members.map((member) => ({
        learnerId: String(member.learner_id),
        displayName: String(member.display_name),
        joinedAt: new Date(String(member.joined_at)).toISOString(),
        progress: Number(member.progress ?? 0),
        attempts: Number(member.attempts ?? 0),
      })),
    };
  }

  async create(input: {
    hostLearnerId: string;
    displayName: string;
    title: string;
    materialId?: string;
    summary: string;
    concepts: string[];
  }) {
    await this.ready;
    const id = randomUUID();
    let code = roomCode();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await this.sql`
        SELECT 1 FROM instantstudy_rooms WHERE code = ${code} LIMIT 1
      `;
      if (!existing.length) break;
      code = roomCode();
    }

    const concepts = JSON.stringify(input.concepts.slice(0, 20));
    await this.sql`
      INSERT INTO instantstudy_rooms (
        id, code, host_learner_id, title, material_id, summary, concepts_json
      )
      VALUES (
        ${id}::uuid,
        ${code},
        ${input.hostLearnerId},
        ${input.title},
        ${input.materialId ?? null}::uuid,
        ${input.summary},
        ${concepts}::jsonb
      )
    `;

    await this.sql`
      INSERT INTO instantstudy_room_members (
        room_id, learner_id, display_name
      )
      VALUES (
        ${id}::uuid,
        ${input.hostLearnerId},
        ${input.displayName}
      )
    `;

    return (await this.hydrate(code))!;
  }

  async join(input: { code: string; learnerId: string; displayName: string }) {
    const room = await this.hydrate(input.code);
    if (!room) return null;

    await this.sql`
      INSERT INTO instantstudy_room_members (
        room_id, learner_id, display_name
      )
      VALUES (
        ${room.id}::uuid,
        ${input.learnerId},
        ${input.displayName}
      )
      ON CONFLICT (room_id, learner_id) DO UPDATE SET
        display_name = EXCLUDED.display_name
    `;

    await this.sql`
      UPDATE instantstudy_rooms SET updated_at = now()
      WHERE id = ${room.id}::uuid
    `;

    return this.hydrate(input.code);
  }

  async get(code: string) {
    return this.hydrate(code);
  }

  async progress(input: {
    code: string;
    learnerId: string;
    progress: number;
    attempts: number;
  }) {
    const room = await this.hydrate(input.code);
    if (!room) return null;

    const updated = await this.sql`
      UPDATE instantstudy_room_members
      SET progress = ${Math.max(0, Math.min(1, input.progress))},
          attempts = ${Math.max(0, input.attempts)}
      WHERE room_id = ${room.id}::uuid
        AND learner_id = ${input.learnerId}
      RETURNING learner_id
    `;

    if (!updated.length) return null;

    await this.sql`
      UPDATE instantstudy_rooms SET updated_at = now()
      WHERE id = ${room.id}::uuid
    `;

    return this.hydrate(input.code);
  }
}

class UnavailableStudyRoomStore implements StudyRoomStore {
  private unavailable(): never {
    throw new DurableDatabaseRequiredError();
  }
  async create(_input: {
    hostLearnerId: string;
    displayName: string;
    title: string;
    materialId?: string;
    summary: string;
    concepts: string[];
  }) {
    return this.unavailable();
  }
  async join(_input: { code: string; learnerId: string; displayName: string }) {
    return this.unavailable();
  }
  async get(_code: string) {
    return this.unavailable();
  }
  async progress(_input: {
    code: string;
    learnerId: string;
    progress: number;
    attempts: number;
  }) {
    return this.unavailable();
  }
}

export function createStudyRoomStore(): StudyRoomStore {
  const url = databaseUrl();
  if (url) return new NeonStudyRoomStore(url);
  return durableDatabaseRequired()
    ? new UnavailableStudyRoomStore()
    : new MemoryStudyRoomStore();
}

export const studyRoomStore = createStudyRoomStore();
