import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { BridgeQueue } from "./bridgeQueue.js";
import { AdaptyClient } from "./adapty.js";
import { readFileSync } from "node:fs";
import { ContentSessionStore } from "./contentSessions.js";
import { StudyEngine } from "./studyEngine.js";
import { ingestFiles } from "./ingest.js";

const PORT = Number.parseInt(process.env.PORT ?? "8000", 10);
const DEVICE_ID = process.env.INSTANTSTUDY_DEVICE_ID ?? "dev-device";
const BRIDGE_TOKEN = process.env.INSTANTSTUDY_BRIDGE_TOKEN ?? "replace-me";
const TIMEOUT_MS = Number.parseInt(
  process.env.ANKI_COMMAND_TIMEOUT_MS ?? "15000",
  10,
);

const bridge = new BridgeQueue(TIMEOUT_MS);
const contentSessions = new ContentSessionStore();
const studyEngine = new StudyEngine();
const API_KEY = process.env.INSTANTSTUDY_API_KEY ?? "replace-me-api-key";
const adapty = new AdaptyClient({
  publicApiKey: process.env.ADAPTY_PUBLIC_API_KEY,
  secretApiKey: process.env.ADAPTY_SECRET_API_KEY,
  placementId: process.env.ADAPTY_PLACEMENT_ID ?? "instantstudy_main",
  store: process.env.ADAPTY_STORE ?? "stripe",
});
const openapiSpec = readFileSync(
  new URL("../../../openapi.yaml", import.meta.url),
  "utf8",
);

const studyFileSchema = z.object({
  download_url: z.string().url(),
  file_id: z.string().min(1),
  mime_type: z.string().optional(),
  file_name: z.string().optional(),
});

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
    mode: z.enum(["learn", "review", "quiz", "test"]).default("learn"),
    targetMinutes: z.number().int().min(1).max(180).optional(),
    maxQuestions: z.number().int().min(1).max(50).default(12),
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
      mode,
      targetMinutes,
      maxQuestions,
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

      const studySession = studyEngine.start(contentSession, {
        mode,
        targetMinutes,
        maxQuestions,
        concepts,
      });

      const next = studyEngine.next(studySession.id);

      return toolResult({
        contentSessionId: contentSession.id,
        studySessionId: studySession.id,
        status: studySession.status,
        title: studySession.title,
        mode: studySession.mode,
        goal: studySession.goal,
        conceptCount: studySession.concepts.length,
        ingestion: ingested.files,
        next,
        nextAction:
          "Ask the returned next question now. After the learner answers, evaluate correctness and completeness against the source, then call submit_study_answer before continuing.",
      });
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
      const session = contentSessions.get(sessionId);
      if (!session) {
        throw new Error("Study session not found.");
      }

      return toolResult({
        sessionId: session.id,
        status: session.status,
        title: session.title,
        mode: session.mode,
        goal: session.goal,
        contentText: session.contentText,
        sources: session.files.map((file) => ({
          fileId: file.file_id,
          fileName: file.file_name,
          mimeType: file.mime_type,
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
      return toolResult(studyEngine.next(studySessionId));
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
        studyEngine.submit(studySessionId, conceptId, {
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
      return toolResult(studyEngine.finish(studySessionId));
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
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function bridgeAuthorized(req: express.Request) {
  const authorization = req.header("authorization");
  return authorization === `Bearer ${BRIDGE_TOKEN}`;
}

function apiAuthorized(req: express.Request) {
  const authorization = req.header("authorization");
  return authorization === `Bearer ${API_KEY}`;
}

function requireApiAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (!apiAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

function sendApiError(res: express.Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";
  res.status(500).json({ error: "internal_error", message });
}

app.get("/openapi.yaml", (_req, res) => {
  res.type("application/yaml").send(openapiSpec);
});

app.use("/api/v1", requireApiAuth);

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
    const studySession = studyEngine.start(contentSession, {
      mode: input.mode,
      targetMinutes: input.targetMinutes,
      maxQuestions: input.maxQuestions,
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
      next: studyEngine.next(studySession.id),
    });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/v1/study/sessions/:sessionId", (req, res) => {
  const session = contentSessions.get(req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: "study_session_not_found" });
    return;
  }

  res.json({
    sessionId: session.id,
    status: session.status,
    title: session.title,
    mode: session.mode,
    goal: session.goal,
    contentText: session.contentText,
    sources: session.files.map((file) => ({
      fileId: file.file_id,
      fileName: file.file_name,
      mimeType: file.mime_type,
    })),
  });
});

app.post("/api/v1/study/next", (req, res) => {
  try {
    const input = z
      .object({ studySessionId: z.string().uuid() })
      .parse(req.body ?? {});
    res.json(studyEngine.next(input.studySessionId));
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/v1/study/answer", (req, res) => {
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
      studyEngine.submit(input.studySessionId, input.conceptId, {
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

app.post("/api/v1/study/finish", (req, res) => {
  try {
    const input = z
      .object({ studySessionId: z.string().uuid() })
      .parse(req.body ?? {});
    res.json(studyEngine.finish(input.studySessionId));
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
  res.json({
    ok: true,
    service: "instantstudy-mcp",
    device: bridge.status(DEVICE_ID),
  });
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

app.listen(PORT, () => {
  console.log(
    `InstantStudy MCP listening on http://localhost:${PORT}/mcp`,
  );
});
