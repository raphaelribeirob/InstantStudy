import { randomUUID } from "node:crypto";

export type StudyMode = "learn" | "review" | "quiz" | "test";

export type StudyFile = {
  download_url?: string;
  inline_base64?: string;
  file_id: string;
  mime_type?: string;
  file_name?: string;
};

export type ContentSession = {
  id: string;
  createdAt: string;
  title: string;
  mode: StudyMode;
  goal?: string;
  contentText?: string;
  files: StudyFile[];
  status: "ready";
};

export class ContentSessionStore {
  private sessions = new Map<string, ContentSession>();

  create(input: {
    title?: string;
    mode?: StudyMode;
    goal?: string;
    contentText?: string;
    files?: StudyFile[];
  }) {
    const files = input.files ?? [];

    if (!input.contentText?.trim() && files.length === 0) {
      throw new Error("Provide contentText or at least one file.");
    }

    const session: ContentSession = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      title:
        input.title?.trim() ||
        files[0]?.file_name?.trim() ||
        "Untitled study session",
      mode: input.mode ?? "learn",
      goal: input.goal?.trim() || undefined,
      contentText: input.contentText?.trim() || undefined,
      files,
      status: "ready",
    };

    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string) {
    return this.sessions.get(id) ?? null;
  }
}
