import express from "express";
import { ZodError } from "zod";
import { validateEvent, pageSchema, products } from "./contract.js";
import { AuthUnavailableError, createAuthenticator } from "./auth.js";
import {
  DatabaseUnavailableError, CursorNotFoundError,
  IdempotencyConflictError, createStore,
} from "./store.js";

export function createApp({ authenticate = createAuthenticator(), store = createStore() } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "24kb", strict: true }));

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "instant-cloud" }));
  app.get("/health/ready", async (_req, res) => {
    try { await store.healthy(); res.json({ status: "ready" }); }
    catch { res.status(503).json({ error: "database_unavailable" }); }
  });

  app.use("/v1", async (req, res, next) => {
    try {
      const scope = req.method === "GET" ? "cloud:read" : "cloud:write";
      res.locals.principal = await authenticate(req.header("authorization"), scope);
      res.setHeader("cache-control", "no-store");
      next();
    } catch (error) {
      if (error instanceof AuthUnavailableError) {
        return res.status(503).json({ error: "oauth_not_configured" });
      }
      res.setHeader("WWW-Authenticate", 'Bearer realm="Instant Cloud"');
      res.status(401).json({ error: "unauthorized" });
    }
  });

  app.get("/v1/me", (req, res) => res.json({
    id: res.locals.principal.userId, products, version: "v1",
  }));

  app.get("/v1/progress", async (_req, res, next) => {
    try {
      const rows = await store.summary(res.locals.principal.userId);
      res.json({ products: rows.map(row => ({
        product: row.product,
        eventCount: Number(row.event_count),
        sessions: Number(row.sessions),
        reviews: Number(row.reviews),
        durationSeconds: Number(row.duration_seconds),
        lastActivity: row.last_activity,
      })) });
    } catch (error) { next(error); }
  });

  app.get("/v1/progress/events", async (req, res, next) => {
    try {
      const filter = pageSchema.parse(req.query);
      res.json(await store.listEvents(res.locals.principal.userId, filter));
    } catch (error) { next(error); }
  });

  app.post("/v1/progress/events", async (req, res, next) => {
    try {
      const event = validateEvent(req.body);
      const saved = await store.addEvent(res.locals.principal.userId, event);
      res.status(saved.created ? 201 : 200).json(saved);
    } catch (error) { next(error); }
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof ZodError || error instanceof CursorNotFoundError) {
      return res.status(400).json({ error: "invalid_request" });
    }
    if (error.message === "event_timestamp_out_of_range") {
      return res.status(400).json({ error: "invalid_event_time" });
    }
    if (error instanceof IdempotencyConflictError) {
      return res.status(409).json({ error: "event_id_conflict" });
    }
    if (error instanceof DatabaseUnavailableError) {
      return res.status(503).json({ error: "database_unavailable" });
    }
    console.error("Instant Cloud request failed:", error?.message || "unknown");
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}
