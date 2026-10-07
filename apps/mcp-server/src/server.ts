import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import * as helmetNamespace from "helmet";
import { rateLimit } from "express-rate-limit";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { BridgeQueue } from "./bridgeQueue.js";
import { AdaptyClient } from "./adapty.js";
import { readFileSync } from "node:fs";
import { ContentSessionStore } from "./contentSessions.js";
import { StudyEngine } from "./studyEngine.js";
import { ingestFiles } from "./ingest.js";
import { studyEntitlements, UsageLimitError } from "./entitlements.js";
import { answerFromSource, gradeStudyAnswer } from "./learningIntelligence.js";
import { generateStudyAssets } from "./studyAssets.js";
import { materialStore } from "./materialStore.js";
import { buildAudioStudy, buildStudyGame } from "./offerLayer.js";
import { studyRoomStore } from "./studyRoomStore.js";
import {
  databaseUrl,
  durableStorageMode,
  DurableDatabaseRequiredError,
} from "./databasePolicy.js";

type HelmetOptions = {
  contentSecurityPolicy?: boolean;
  crossOriginEmbedderPolicy?: boolean;
  crossOriginResourcePolicy?: boolean;
};

const helmet = (
  (helmetNamespace as unknown as { default?: unknown }).default ??
  helmetNamespace
) as unknown as (options?: HelmetOptions) => express.RequestHandler;

const PORT = Number.parseInt(process.env.PORT ?? "8000", 10);
const DEVICE_ID = process.env.INSTANTSTUDY_DEVICE_ID ?? "dev-device";
const BRIDGE_TOKEN = (process.env.INSTANTSTUDY_BRIDGE_TOKEN ?? "").trim();
const TIMEOUT_MS = Number.parseInt(
  process.env.ANKI_COMMAND_TIMEOUT_MS ?? "15000",
  10,
);

const bridge = new BridgeQueue(TIMEOUT_MS);
const contentSessions = new ContentSessionStore();
const studyEngine = new StudyEngine();
const API_KEY = (process.env.INSTANTSTUDY_API_KEY ?? "").trim();
const MCP_KEY = (
  process.env.INSTANTSTUDY_MCP_API_KEY ??
  process.env.INSTANTSTUDY_API_KEY ??
  ""
).trim();
const ADMIN_KEY = (process.env.INSTANTSTUDY_ADMIN_API_KEY ?? "").trim();
const PUBLIC_URL = (process.env.INSTANTSTUDY_PUBLIC_URL ?? "").replace(/\/$/, "");
const adapty = new AdaptyClient({
  publicApiKey: process.env.ADAPTY_PUBLIC_API_KEY,
  secretApiKey: process.env.ADAPTY_SECRET_API_KEY,
  placementId: process.env.ADAPTY_PLACEMENT_ID ?? "instantstudy_main",
  store: process.env.ADAPTY_STORE ?? "stripe",
});
const openapiSpec = readFileSync(
  new URL("../openapi.yaml", import.meta.url),
  "utf8",
);

const studyFileSchema = z
  .object({
    download_url: z.string().url().optional(),
    inline_base64: z.string().min(1).max(3_500_000).optional(),
    file_id: z.string().min(1).max(200),
    mime_type: z.string().max(200).optional(),
    file_name: z.string().max(300).optional(),
  })
  .refine(
    (file) => Boolean(file.download_url) !== Boolean(file.inline_base64),
    { message: "Provide exactly one of download_url or inline_base64." },
  );


const materialImportSchema = z
  .object({
    learnerId: z.string().min(3).max(200),
    title: z.string().min(1).max(200).optional(),
    sourceType: z.enum(["paste", "upload", "drive", "audio"]).default("paste"),
    contentText: z.string().max(200000).optional(),
    files: z.array(studyFileSchema).max(10).default([]),
  })
  .refine(
    (input) => Boolean(input.contentText?.trim()) || input.files.length > 0,
    { message: "Provide contentText or at least one file." },
  );

const prepareStudySchema = z
  .object({
    contentText: z
      .string()
      .max(200000)
      .optional()
      .describe(
        "Relevant pasted/extracted study content. When the host can read an attached file, include the important text here so the session remains portable across LLMs.",
      ),
    files: z
      .array(studyFileSchema)
      .max(10)
      .default([])
      .describe("Files supplied by the host, including ChatGPT file inputs."),
    title: z.string().min(1).max(200).optional(),
    goal: z.string().min(1).max(500).optional(),
    learnerId: z
      .string()
      .min(3)
      .max(200)
      .optional()
      .describe(
        "Stable authenticated learner/profile identifier. Supply it to preserve mastery and due reviews across sessions.",
      ),
    billingPlan: z.enum(["free", "plus", "unlimited"]).optional(),
    mode: z.enum(["learn", "review", "quiz", "test"]).default("learn"),
    targetMinutes: z.number().int().min(1).max(180).optional(),
    maxQuestions: z.number().int().min(1).max(50).default(12),
    testDurationMinutes: z.number().int().min(1).max(180).optional(),
    testQuestionTypes: z
      .array(
        z.enum([
          "multiple_choice",
          "true_false",
          "short_answer",
          "free_recall",
          "application",
        ]),
      )
      .min(1)
      .max(5)
      .optional(),
    concepts: z
      .array(
        z.object({
          label: z.string().min(1).max(200),
          sourceExcerpt: z.string().max(1200).optional(),
        }),
      )
      .max(30)
      .optional(),
  })
  .refine(
    (input) => Boolean(input.contentText?.trim()) || input.files.length > 0,
    { message: "Provide contentText or at least one file." },
  );

type AnkiCard = {
  cardId?: number;
  note?: number;
  deckName?: string;
  modelName?: string;
  question?: string;
  answer?: string;
  fields?: Record<string, unknown>;
  interval?: number;
  reps?: number;
  lapses?: number;
};

function asObject(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : { value: data };
}

function toolResult(data: unknown) {
  const structuredContent = asObject(data);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(structuredContent),
      },
    ],
    structuredContent,
  };
}

function escapeDeckName(deckName: string) {
  return deckName.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

async function callAnki(
  action: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  return bridge.dispatch(DEVICE_ID, action, params);
}

async function cardsFromQuery(query: string, limit: number) {
  const ids = (await callAnki("findCards", { query })) as number[];
  const selected = Array.isArray(ids) ? ids.slice(0, limit) : [];
  if (!selected.length) return [];

  const cards = (await callAnki("cardsInfo", {
    cards: selected,
  })) as AnkiCard[];

  return Array.isArray(cards)
    ? cards.map((card) => ({
        cardId: card.cardId,
        noteId: card.note,
        deckName: card.deckName,
        modelName: card.modelName,
        question: card.question,
        answer: card.answer,
        fields: card.fields,
        interval: card.interval,
        reps: card.reps,
        lapses: card.lapses,
      }))
    : [];
}

function createMcpServer() {
  const server = new McpServer({
    name: "instantstudy",
    version: "0.1.0",
  });

  server.registerTool(
    "prepare_study",
    {
      title: "Start InstantStudy from content",
      description:
        "PRIMARY CONTENT-FIRST ENTRY. Use immediately when the learner pastes notes, provides content in the conversation, or uploads files and asks to study, learn, review, quiz, test, or 'InstantStudy' them. Create the study session before asking onboarding questions. Do not require Anki. If the host can read the supplied file, also pass the relevant extracted text in contentText. After this tool returns, begin the first study question immediately.",
      inputSchema: prepareStudySchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: false,
      },
      _meta: {
        "openai/fileParams": ["files"],
      },
    },
    async ({
      contentText,
      files,
      title,
      goal,
      learnerId,
      mode,
      targetMinutes,
      maxQuestions,
      testDurationMinutes,
      testQuestionTypes,
      concepts,
    }) => {
      const ingested = files.length ? await ingestFiles(files) : { text: "", files: [] };
      const combinedText = [contentText?.trim(), ingested.text.trim()]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 200000);

      const contentSession = contentSessions.create({
        contentText: combinedText || undefined,
        files,
        title,
        goal,
        mode,
      });

      const usage = learnerId
        ? await studyEntitlements.consume(learnerId, mode)
        : undefined;

      const studySession = await studyEngine.start(contentSession, {
        learnerId,
        mode,
        targetMinutes,
        maxQuestions,
        testDurationMinutes,
        testQuestionTypes,
        concepts,
      });

      const next = await studyEngine.next(studySession.id);

      return toolResult({
        contentSessionId: contentSession.id,
        studySessionId: studySession.id,
        status: studySession.status,
        title: studySession.title,
        mode: studySession.mode,
        goal: studySession.goal,
        conceptCount: studySession.concepts.length,
        ingestion: ingested.files,
        usage,
        next,
        nextAction:
          "Ask the returned next question now. After the learner answers, evaluate correctness and completeness against the source, then call submit_study_answer before continuing.",
      });
    },
  );

  server.registerTool(
    "get_study_plan",
    {
      title: "Get InstantStudy plan and usage",
      description:
        "Return the learner's current Free, Plus, or Unlimited entitlement and the remaining monthly Learn/Test allowance.",
      inputSchema: z.object({
        learnerId: z.string().min(3).max(200),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ learnerId }) => {
      return toolResult(await studyEntitlements.getStatus(learnerId));
    },
  );

  server.registerTool(
    "get_study_session",
    {
      title: "Get InstantStudy session",
      description:
        "Retrieve the active content-first study session and its source context.",
      inputSchema: z.object({
        sessionId: z.string().uuid(),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ sessionId }) => {
      const session = await studyEngine.get(sessionId);
      if (!session) {
        throw new Error("Study session not found.");
      }

      return toolResult({
        sessionId: session.id,
        contentSessionId: session.contentSessionId,
        status: session.status,
        title: session.title,
        mode: session.mode,
        goal: session.goal,
        questionIndex: session.questionIndex,
        maxQuestions: session.maxQuestions,
        concepts: session.concepts.map((concept) => ({
          id: concept.id,
          label: concept.label,
          mastery: Number(concept.mastery.toFixed(2)),
          attempts: concept.attempts,
          difficulty: concept.difficulty,
          missingConcepts: concept.missingConcepts,
        })),
      });
    },
  );

  server.registerTool(
    "next_study_question",
    {
      title: "Get next adaptive study question",
      description:
        "Return the next study target and question policy for an active InstantStudy session. Generate exactly one question from the provided concept/source excerpt and follow the mode-specific policy.",
      inputSchema: z.object({
        studySessionId: z.string().uuid(),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ studySessionId }) => {
      return toolResult(await studyEngine.next(studySessionId));
    },
  );

  server.registerTool(
    "submit_study_answer",
    {
      title: "Record a learner answer",
      description:
        "After the learner answers an InstantStudy question, semantically evaluate it against the source and submit the result. correctness/completeness are 0..1. Use missingConcepts for important omissions. InstantStudy updates mastery and difficulty consistently across LLM hosts.",
      inputSchema: z.object({
        studySessionId: z.string().uuid(),
        conceptId: z.string().uuid(),
        correctness: z.number().min(0).max(1),
        completeness: z.number().min(0).max(1),
        confidence: z.number().min(0).max(1).default(0.8),
        missingConcepts: z.array(z.string().min(1).max(200)).max(10).default([]),
        userAnswer: z.string().max(20000).optional(),
        feedback: z.string().max(10000).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({
      studySessionId,
      conceptId,
      correctness,
      completeness,
      confidence,
      missingConcepts,
      userAnswer,
      feedback,
    }) => {
      return toolResult(
        await studyEngine.submit(studySessionId, conceptId, {
          correctness,
          completeness,
          confidence,
          missingConcepts,
          userAnswer,
          feedback,
        }),
      );
    },
  );

  server.registerTool(
    "finish_study_session",
    {
      title: "Finish InstantStudy session",
      description:
        "Finish an active study session and return a concise mastery/weakness summary.",
      inputSchema: z.object({
        studySessionId: z.string().uuid(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ studySessionId }) => {
      return toolResult(await studyEngine.finish(studySessionId));
    },
  );

  server.registerTool(
    "get_due_reviews",
    {
      title: "Get due InstantStudy reviews",
      description:
        "Return concepts that are due for retrieval practice for a stable learnerId. Use this to start short retention sessions from prior learning without requiring the learner to re-upload the original material.",
      inputSchema: z.object({
        learnerId: z.string().min(3).max(200),
        before: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ learnerId, before, limit }) => {
      return toolResult(
        await studyEngine.dueReviews(learnerId, { before, limit }),
      );
    },
  );

  server.registerTool(
    "anki_status",
    {
      title: "Check Anki connection",
      description:
        "Check whether the learner's Anki is reachable through InstantStudy. Use before starting a study session if connection state is unknown.",
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      const version = await callAnki("version");
      return toolResult({
        connected: true,
        ankiConnectVersion: version,
        deviceId: DEVICE_ID,
      });
    },
  );

  server.registerTool(
    "list_decks",
    {
      title: "List Anki decks",
      description:
        "List the learner's Anki deck names. Use when choosing what to study or when the learner asks what decks they have.",
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      const decks = await callAnki("deckNames");
      return toolResult({ decks });
    },
  );

  server.registerTool(
    "get_due_cards",
    {
      title: "Get due Anki cards",
      description:
        "Retrieve due cards for a study session. The result includes both question and expected answer so you can evaluate the learner semantically. Do not reveal the expected answer before the learner attempts the question unless they ask.",
      inputSchema: z.object({
        deckName: z
          .string()
          .min(1)
          .optional()
          .describe("Optional exact Anki deck name."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Maximum cards to retrieve."),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ deckName, limit }) => {
      const query = deckName
        ? `deck:"${escapeDeckName(deckName)}" is:due`
        : "is:due";
      const cards = await cardsFromQuery(query, limit);
      return toolResult({ query, count: cards.length, cards });
    },
  );

  server.registerTool(
    "search_cards",
    {
      title: "Search Anki cards",
      description:
        "Search the learner's Anki collection using Anki search syntax, then return bounded card details.",
      inputSchema: z.object({
        query: z.string().min(1).max(500),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ query, limit }) => {
      const cards = await cardsFromQuery(query, limit);
      return toolResult({ query, count: cards.length, cards });
    },
  );

  server.registerTool(
    "create_card",
    {
      title: "Create Anki card",
      description:
        "Create a Basic Anki note from a front, back, deck, and optional tags. Use only when the learner wants to save new material to Anki.",
      inputSchema: z.object({
        deckName: z.string().min(1).max(200),
        front: z.string().min(1).max(10000),
        back: z.string().min(1).max(20000),
        tags: z.array(z.string().min(1).max(100)).max(20).default([]),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ deckName, front, back, tags }) => {
      const noteId = await callAnki("addNote", {
        note: {
          deckName,
          modelName: "Basic",
          fields: {
            Front: front,
            Back: back,
          },
          tags,
        },
      });

      return toolResult({ created: noteId !== null, noteId });
    },
  );

  server.registerTool(
    "record_review",
    {
      title: "Record Anki review",
      description:
        "Record the learner's answer in Anki after evaluating it. Ease: 1 Again, 2 Hard, 3 Good, 4 Easy. Prefer conservative grading when important information is missing.",
      inputSchema: z.object({
        cardId: z.number().int().positive(),
        ease: z
          .number()
          .int()
          .min(1)
          .max(4)
          .describe("1 Again, 2 Hard, 3 Good, 4 Easy."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ cardId, ease }) => {
      const result = await callAnki("answerCards", {
        answers: [{ cardId, ease }],
      });

      const success =
        Array.isArray(result) && result.length > 0 ? Boolean(result[0]) : false;

      return toolResult({ success, cardId, ease });
    },
  );

  server.registerTool(
    "get_subscription_offer",
    {
      title: "Get InstantStudy subscription offer",
      description:
        "Resolve the active subscription offer selected by Adapty for this learner. Call only when the learner asks about pricing, upgrading, subscribing, or paid access. The returned variation may be part of a pricing A/B test.",
      inputSchema: z.object({
        customerId: z
          .string()
          .min(1)
          .max(200)
          .describe("Stable InstantStudy customer identifier."),
        locale: z
          .string()
          .min(2)
          .max(20)
          .default("en")
          .describe("BCP-47 style locale such as en, en-US, or pt-BR."),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ customerId, locale }) => {
      const offer = await adapty.getOffer(customerId, locale);
      return toolResult(offer);
    },
  );

  return server;
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

const allowedOrigins = new Set(
  (process.env.INSTANTSTUDY_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (PUBLIC_URL) {
  try {
    allowedOrigins.add(new URL(PUBLIC_URL).origin);
  } catch {
    // Invalid public URL is ignored here. Health still exposes readiness.
  }
}

if (!process.env.VERCEL) {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://127.0.0.1:5173");
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("cors_origin_denied"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["authorization", "content-type", "mcp-session-id"],
    maxAge: 600,
  }),
);
app.use(express.json({ limit: "4mb", strict: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number.parseInt(process.env.INSTANTSTUDY_API_RATE_LIMIT ?? "240", 10),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const mcpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number.parseInt(process.env.INSTANTSTUDY_MCP_RATE_LIMIT ?? "120", 10),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const bridgeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number.parseInt(process.env.INSTANTSTUDY_BRIDGE_RATE_LIMIT ?? "60", 10),
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use("/mcp", mcpLimiter);
app.use("/bridge", bridgeLimiter);

function configuredSecret(secret: string) {
  return Boolean(secret && !secret.startsWith("replace-me"));
}

function bearerMatches(req: express.Request, expected: string) {
  if (!configuredSecret(expected)) return false;
  const authorization = req.header("authorization") ?? "";
  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix)) return false;

  const supplied = authorization.slice(prefix.length);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

function bridgeAuthorized(req: express.Request) {
  return bearerMatches(req, BRIDGE_TOKEN);
}

function apiAuthorized(req: express.Request) {
  return bearerMatches(req, API_KEY);
}

function mcpAuthorized(req: express.Request) {
  return bearerMatches(req, MCP_KEY);
}

function adminAuthorized(req: express.Request) {
  return bearerMatches(req, ADMIN_KEY);
}

function requireApiAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  // Administrative routes have their own isolated credential boundary.
  if (req.path.startsWith("/admin/")) {
    next();
    return;
  }

  if (!apiAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (!adminAuthorized(req)) {
    res.status(401).json({ error: "admin_unauthorized" });
    return;
  }
  next();
}

function sendApiError(res: express.Response, error: unknown) {
  if (error instanceof DurableDatabaseRequiredError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof UsageLimitError) {
    res.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      metric: error.metric,
      usage: error.usage,
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  res.status(500).json({ error: "internal_error", message });
}

app.get("/connection.json", (req, res) => {
  const origin = PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  res.json({
    name: "InstantStudy",
    description: "Adaptive Study Engine for tool-capable LLM agents.",
    transport: "streamable-http",
    mcp: `${origin}/mcp`,
    openapi: `${origin}/openapi.yaml`,
    capabilities: [
      "content-first study",
      "learn",
      "review",
      "quiz",
      "test",
      "adaptive mastery",
      "native PDF/DOCX/PPTX ingestion",
      "monthly plan entitlements",
      "optional audio transcription",
      "handwritten-note image transcription",
      "retention insights and streaks",
      "conversational podcast",
      "content-based study game",
      "study rooms",
      "family entitlement synchronization",
      "optional Anki",
    ],
  });
});

app.get("/openapi.yaml", (req, res) => {
  const origin = PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  res
    .type("application/yaml")
    .send(
      openapiSpec.replaceAll(
        "https://YOUR_INSTANTSTUDY_HOST",
        origin,
      ),
    );
});

app.use("/api/v1", apiLimiter, requireApiAuth);

app.post("/api/v1/materials/import", async (req, res) => {
  try {
    const input = materialImportSchema.parse(req.body ?? {});
    const ingested = input.files.length
      ? await ingestFiles(input.files)
      : { text: "", files: [] };
    const content = [input.contentText?.trim(), ingested.text.trim()]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 200000);

    if (!content) {
      res.status(422).json({
        error: "material_has_no_text",
        ingestion: ingested.files,
      });
      return;
    }

    const assets = generateStudyAssets(content);
    const material = await materialStore.save({
      learnerId: input.learnerId,
      title:
        input.title?.trim() ||
        input.files[0]?.file_name?.trim() ||
        "Untitled study material",
      content,
      sourceType: input.sourceType,
      sourceNames: input.files
        .map((file) => file.file_name?.trim())
        .filter((name): name is string => Boolean(name)),
      assets,
    });

    res.json({ material, ingestion: ingested.files });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/materials/list", async (req, res) => {
  try {
    const input = z
      .object({
        learnerId: z.string().min(3).max(200),
        query: z.string().max(200).default(""),
        limit: z.number().int().min(1).max(100).default(50),
      })
      .parse(req.body ?? {});

    const materials = await materialStore.list(
      input.learnerId,
      input.query,
      input.limit,
    );
    res.json({ materials });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/materials/get", async (req, res) => {
  try {
    const input = z
      .object({
        learnerId: z.string().min(3).max(200),
        id: z.string().uuid(),
      })
      .parse(req.body ?? {});

    const material = await materialStore.get(input.learnerId, input.id);
    if (!material) {
      res.status(404).json({ error: "material_not_found" });
      return;
    }
    res.json({ material });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/assets/generate", async (req, res) => {
  try {
    const input = z
      .object({ contentText: z.string().min(1).max(200000) })
      .parse(req.body ?? {});
    res.json(generateStudyAssets(input.contentText));
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/insights", async (req, res) => {
  try {
    const input = z
      .object({ learnerId: z.string().min(3).max(200) })
      .parse(req.body ?? {});
    res.json(await studyEngine.insights(input.learnerId));
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/study-game", async (req, res) => {
  try {
    const input = z
      .object({
        learnerId: z.string().min(3).max(200),
        materialId: z.string().uuid(),
      })
      .parse(req.body ?? {});

    const material = await materialStore.get(input.learnerId, input.materialId);
    if (!material) {
      res.status(404).json({ error: "material_not_found" });
      return;
    }

    const game = buildStudyGame(material.title, material.assets);
    if (!game.pairCount) {
      res.status(422).json({ error: "study_game_requires_flashcards" });
      return;
    }

    res.json(game);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/audio-study", async (req, res) => {
  try {
    const input = z
      .object({
        learnerId: z.string().min(3).max(200),
        materialId: z.string().uuid(),
      })
      .parse(req.body ?? {});

    const material = await materialStore.get(input.learnerId, input.materialId);
    if (!material) {
      res.status(404).json({ error: "material_not_found" });
      return;
    }

    res.json(buildAudioStudy(material.title, material.assets));
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/rooms/create", async (req, res) => {
  try {
    const input = z
      .object({
        learnerId: z.string().min(3).max(200),
        displayName: z.string().min(1).max(80),
        materialId: z.string().uuid(),
      })
      .parse(req.body ?? {});

    const material = await materialStore.get(input.learnerId, input.materialId);
    if (!material) {
      res.status(404).json({ error: "material_not_found" });
      return;
    }

    const room = await studyRoomStore.create({
      hostLearnerId: input.learnerId,
      displayName: input.displayName,
      title: material.title,
      materialId: material.id,
      summary: material.assets.summary,
      concepts: material.assets.keyConcepts,
    });
    res.json({ room });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/rooms/join", async (req, res) => {
  try {
    const input = z
      .object({
        learnerId: z.string().min(3).max(200),
        displayName: z.string().min(1).max(80),
        code: z.string().min(4).max(12),
      })
      .parse(req.body ?? {});

    const room = await studyRoomStore.join({
      code: input.code,
      learnerId: input.learnerId,
      displayName: input.displayName,
    });
    if (!room) {
      res.status(404).json({ error: "study_room_not_found" });
      return;
    }
    res.json({ room });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/rooms/get", async (req, res) => {
  try {
    const input = z
      .object({
        learnerId: z.string().min(3).max(200),
        code: z.string().min(4).max(12),
      })
      .parse(req.body ?? {});

    const room = await studyRoomStore.get(input.code);
    if (!room || !room.members.some((member) => member.learnerId === input.learnerId)) {
      res.status(404).json({ error: "study_room_not_found" });
      return;
    }
    res.json({ room });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/rooms/progress", async (req, res) => {
  try {
    const input = z
      .object({
        learnerId: z.string().min(3).max(200),
        code: z.string().min(4).max(12),
        progress: z.number().min(0).max(1),
        attempts: z.number().int().min(0).max(100000),
      })
      .parse(req.body ?? {});

    const room = await studyRoomStore.progress({
      code: input.code,
      learnerId: input.learnerId,
      progress: input.progress,
      attempts: input.attempts,
    });
    if (!room) {
      res.status(404).json({ error: "study_room_not_found" });
      return;
    }
    res.json({ room });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/study/prepare", async (req, res) => {
  try {
    const input = prepareStudySchema.parse(req.body ?? {});
    const ingested = input.files.length
      ? await ingestFiles(input.files)
      : { text: "", files: [] };
    const combinedText = [input.contentText?.trim(), ingested.text.trim()]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 200000);

    const contentSession = contentSessions.create({
      ...input,
      contentText: combinedText || undefined,
    });
    if (input.learnerId && input.billingPlan) {
      await studyEntitlements.setPlan(input.learnerId, input.billingPlan);
    }
    const usage = input.learnerId
      ? await studyEntitlements.consume(input.learnerId, input.mode)
      : undefined;

    const studySession = await studyEngine.start(contentSession, {
      learnerId: input.learnerId,
      mode: input.mode,
      targetMinutes: input.targetMinutes,
      maxQuestions: input.maxQuestions,
      testDurationMinutes: input.testDurationMinutes,
      testQuestionTypes: input.testQuestionTypes,
      concepts: input.concepts,
    });

    res.json({
      contentSessionId: contentSession.id,
      studySessionId: studySession.id,
      status: studySession.status,
      title: studySession.title,
      mode: studySession.mode,
      goal: studySession.goal,
      conceptCount: studySession.concepts.length,
      ingestion: ingested.files,
      usage,
      next: await studyEngine.next(studySession.id),
    });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/v1/study/sessions/:sessionId", async (req, res) => {
  const session = await studyEngine.get(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "study_session_not_found" });
    return;
  }

  res.json({
    sessionId: session.id,
    contentSessionId: session.contentSessionId,
    status: session.status,
    title: session.title,
    mode: session.mode,
    goal: session.goal,
    questionIndex: session.questionIndex,
    maxQuestions: session.maxQuestions,
    concepts: session.concepts.map((concept) => ({
      id: concept.id,
      label: concept.label,
      mastery: Number(concept.mastery.toFixed(2)),
      attempts: concept.attempts,
      difficulty: concept.difficulty,
      missingConcepts: concept.missingConcepts,
    })),
  });
});

app.post("/api/v1/study/next", async (req, res) => {
  try {
    const input = z
      .object({ studySessionId: z.string().uuid() })
      .parse(req.body ?? {});
    res.json(await studyEngine.next(input.studySessionId));
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/study/answer", async (req, res) => {
  try {
    const input = z
      .object({
        studySessionId: z.string().uuid(),
        conceptId: z.string().uuid(),
        correctness: z.number().min(0).max(1),
        completeness: z.number().min(0).max(1),
        confidence: z.number().min(0).max(1).default(0.8),
        missingConcepts: z.array(z.string().min(1).max(200)).max(10).default([]),
        userAnswer: z.string().max(20000).optional(),
        feedback: z.string().max(10000).optional(),
      })
      .parse(req.body);

    res.json(
      await studyEngine.submit(input.studySessionId, input.conceptId, {
        correctness: input.correctness,
        completeness: input.completeness,
        confidence: input.confidence,
        missingConcepts: input.missingConcepts,
        userAnswer: input.userAnswer,
        feedback: input.feedback,
      }),
    );
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/study/evaluate", async (req, res) => {
  try {
    const input = z
      .object({
        studySessionId: z.string().uuid(),
        conceptId: z.string().uuid(),
        userAnswer: z.string().min(1).max(20000),
        confidence: z.number().min(0).max(1).optional(),
      })
      .parse(req.body ?? {});

    const session = await studyEngine.get(input.studySessionId);
    if (!session) {
      res.status(404).json({ error: "study_session_not_found" });
      return;
    }

    const concept = session.concepts.find((item) => item.id === input.conceptId);
    if (!concept) {
      res.status(404).json({ error: "concept_not_found" });
      return;
    }

    const grade = await gradeStudyAnswer({
      conceptLabel: concept.label,
      sourceExcerpt: concept.sourceExcerpt,
      userAnswer: input.userAnswer,
    });

    const submission = await studyEngine.submit(
      input.studySessionId,
      input.conceptId,
      {
        correctness: grade.correctness,
        completeness: grade.completeness,
        confidence: input.confidence ?? grade.confidence,
        missingConcepts: grade.missingConcepts,
        userAnswer: input.userAnswer,
        feedback: grade.feedback,
      },
    );

    const next = submission.done
      ? null
      : await studyEngine.next(input.studySessionId);

    res.json({
      grade:
        session.mode === "test"
          ? { recorded: true, provider: grade.provider }
          : grade,
      submission,
      next,
    });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/ask", async (req, res) => {
  try {
    const input = z
      .object({
        contentText: z.string().min(1).max(200000),
        question: z.string().min(1).max(2000),
      })
      .parse(req.body ?? {});

    res.json(await answerFromSource(input.contentText, input.question));
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/study/finish", async (req, res) => {
  try {
    const input = z
      .object({ studySessionId: z.string().uuid() })
      .parse(req.body ?? {});
    res.json(await studyEngine.finish(input.studySessionId));
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/v1/account/usage", async (req, res) => {
  try {
    const input = z
      .object({ learnerId: z.string().min(3).max(200) })
      .parse(req.query);
    res.json(await studyEntitlements.getStatus(input.learnerId));
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/admin/entitlement", requireAdminAuth, async (req, res) => {
  try {
    const input = z
      .object({
        learnerId: z.string().min(3).max(200),
        plan: z.enum(["free", "plus", "unlimited"]),
      })
      .parse(req.body ?? {});

    res.json(await studyEntitlements.setPlan(input.learnerId, input.plan));
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/v1/study/due", async (req, res) => {
  try {
    const input = z
      .object({
        learnerId: z.string().min(3).max(200),
        before: z.string().datetime().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(req.query);

    res.json(
      await studyEngine.dueReviews(input.learnerId, {
        before: input.before,
        limit: input.limit,
      }),
    );
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/v1/status", async (_req, res) => {
  try {
    const version = await callAnki("version");
    res.json({
      connected: true,
      ankiConnectVersion: version,
      deviceId: DEVICE_ID,
    });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/v1/decks", async (_req, res) => {
  try {
    const decks = await callAnki("deckNames");
    res.json({ decks });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/due", async (req, res) => {
  try {
    const input = z
      .object({
        deckName: z.string().min(1).optional(),
        limit: z.number().int().min(1).max(50).default(10),
      })
      .parse(req.body ?? {});

    const query = input.deckName
      ? `deck:"${escapeDeckName(input.deckName)}" is:due`
      : "is:due";
    const cards = await cardsFromQuery(query, input.limit);
    res.json({ query, count: cards.length, cards });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/search", async (req, res) => {
  try {
    const input = z
      .object({
        query: z.string().min(1).max(500),
        limit: z.number().int().min(1).max(50).default(20),
      })
      .parse(req.body);

    const cards = await cardsFromQuery(input.query, input.limit);
    res.json({ query: input.query, count: cards.length, cards });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/cards", async (req, res) => {
  try {
    const input = z
      .object({
        deckName: z.string().min(1).max(200),
        front: z.string().min(1).max(10000),
        back: z.string().min(1).max(20000),
        tags: z.array(z.string().min(1).max(100)).max(20).default([]),
      })
      .parse(req.body);

    const noteId = await callAnki("addNote", {
      note: {
        deckName: input.deckName,
        modelName: "Basic",
        fields: { Front: input.front, Back: input.back },
        tags: input.tags,
      },
    });

    res.json({ created: noteId !== null, noteId });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/reviews", async (req, res) => {
  try {
    const input = z
      .object({
        cardId: z.number().int().positive(),
        ease: z.number().int().min(1).max(4),
      })
      .parse(req.body);

    const result = await callAnki("answerCards", {
      answers: [{ cardId: input.cardId, ease: input.ease }],
    });
    const success =
      Array.isArray(result) && result.length > 0 ? Boolean(result[0]) : false;

    res.json({ success, cardId: input.cardId, ease: input.ease });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/offer", async (req, res) => {
  try {
    const input = z
      .object({
        customerId: z.string().min(1).max(200),
        locale: z.string().min(2).max(20).default("en"),
      })
      .parse(req.body);

    const offer = await adapty.getOffer(input.customerId, input.locale);
    res.json(offer);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/health", (_req, res) => {
  const storage = durableStorageMode();
  res.json({
    ok: storage !== "unavailable",
    service: "instantstudy-mcp",
    storage,
    ingestion: {
      pdf: true,
      docx: true,
      pptx: true,
      text: true,
      audioTranscription: Boolean(process.env.OPENAI_API_KEY),
      imageTranscription: Boolean(process.env.OPENAI_API_KEY),
      maxFileMb: 25,
    },
    entitlements: {
      enabled: true,
      plus: { learnRoundsPerMonth: 20, practiceTestsPerMonth: 3 },
      unlimited: { learnRoundsPerMonth: null, practiceTestsPerMonth: null },
      family: {
        seats: 5,
        inheritedPlan: "unlimited",
        learnRoundsPerMonth: null,
        practiceTestsPerMonth: null,
      },
    },
    security: {
      apiAuthConfigured: configuredSecret(API_KEY),
      mcpAuthConfigured: configuredSecret(MCP_KEY),
      adminAuthConfigured: configuredSecret(ADMIN_KEY),
      bridgeAuthConfigured: configuredSecret(BRIDGE_TOKEN),
      corsAllowlistConfigured: allowedOrigins.size > 0,
      rateLimiting: true,
      helmet: true,
    },
    device: bridge.status(DEVICE_ID),
  });
});

app.get("/health/ready", async (_req, res) => {
  const url = databaseUrl();
  if (!url) {
    res.status(503).json({
      ok: false,
      error: "durable_database_required",
      storage: durableStorageMode(),
    });
    return;
  }

  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    const rows = await sql`SELECT 1 AS ok`;
    res.json({
      ok: Number(rows[0]?.ok ?? 0) === 1,
      storage: "neon",
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: "database_unreachable",
      message: error instanceof Error ? error.message : "Database unavailable",
    });
  }
});

app.post("/bridge/poll", (req, res) => {
  if (!bridgeAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const deviceId = String(req.body?.deviceId ?? "");
  if (deviceId !== DEVICE_ID) {
    res.status(403).json({ error: "unknown_device" });
    return;
  }

  res.json({ command: bridge.poll(deviceId) });
});

app.post("/bridge/result", (req, res) => {
  if (!bridgeAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const deviceId = String(req.body?.deviceId ?? "");
  const commandId = String(req.body?.commandId ?? "");

  if (deviceId !== DEVICE_ID) {
    res.status(403).json({ error: "unknown_device" });
    return;
  }

  const accepted = bridge.complete(
    deviceId,
    commandId,
    req.body?.result,
    req.body?.error ? String(req.body.error) : null,
  );

  res.status(accepted ? 200 : 404).json({ accepted });
});

app.all("/mcp", async (req, res) => {
  if (!mcpAuthorized(req)) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="InstantStudy MCP"');
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
    return;
  }

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message:
            error instanceof Error ? error.message : "Internal server error",
        },
        id: null,
      });
    }
  }
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(
      `InstantStudy MCP listening on http://localhost:${PORT}/mcp`,
    );
  });
}
