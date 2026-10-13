import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApp } from "./app.js";
import { IdempotencyConflictError, CursorNotFoundError } from "./store.js";

const evt = (eventId, product="instant_study") => ({
  eventId, product, kind: "session_completed",
  occurredAt: new Date().toISOString(),
  metrics: { durationSeconds: 45 },
});

test("End-to-end HTTP: auth, account isolation, idempotency, progress and privacy", async (t) => {
  const data = new Map();
  const store = {
    healthy: async () => true,
    async addEvent(userId, event) {
      const items = data.get(userId) || [];
      const other = items.find(i => i.eventId === event.eventId);
      if (other) {
        if (JSON.stringify(other) !== JSON.stringify(event)) throw new IdempotencyConflictError();
        return { eventId: event.eventId, created: false };
      }
      data.set(userId, [...items, event]);
      return { eventId: event.eventId, created: true };
    },
    async summary(userId) {
      return (data.get(userId) || []).length ? [{
        product: "instant_study", event_count: data.get(userId).length,
        sessions: data.get(userId).length, reviews: 0,
        duration_seconds: 45 * data.get(userId).length,
        last_activity: new Date().toISOString(),
      }] : [];
    },
    async listEvents(userId, { afterId }) {
      const records = data.get(userId) || [];
      if (afterId && !records.find(i => i.eventId === afterId)) throw new CursorNotFoundError();
      return { events: records, nextCursor: null };
    },
  };
  const app = createApp({
    store,
    authenticate: async (authorization, scope) => {
      if (!authorization?.startsWith("Bearer test-")) throw Error("invalid_auth");
      if (scope !== "cloud:read" && scope !== "cloud:write") throw Error("invalid_scope");
      return { userId: authorization.slice(12), subject: "test" };
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const origin = "http://127.0.0.1:" + server.address().port;
  async function request(path, user, method = "GET", body) {
    const res = await fetch(origin + path, {
      method,
      headers: {
        ...(user ? { authorization: "Bearer test-" + user } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, json: await res.json() };
  }

  assert.equal((await request("/v1/me")).status, 401);
  assert.equal((await request("/health")).status, 200);
  assert.equal((await request("/health/ready")).status, 200);
  assert.deepEqual((await request("/v1/progress", "alice")).json.products, []);

  const event = evt("7352e2d4-8c18-41cb-9abc-b2bf1350e499");
  assert.equal((await request("/v1/progress/events", "alice", "POST", event)).status, 201);
  assert.equal((await request("/v1/progress/events", "alice", "POST", event)).status, 200);
  assert.equal((await request("/v1/progress/events", "alice", "POST",
    { ...event, metrics: { durationSeconds: 90 } })).status, 409);
  assert.equal((await request("/v1/progress", "alice")).json.products[0].sessions, 1);
  assert.deepEqual((await request("/v1/progress", "bob")).json.products, []);
  assert.equal((await request("/v1/progress/events", "bob",
    "GET")).json.events.length, 0);
  assert.equal((await request("/v1/progress/events?afterId="+event.eventId, "bob")).status, 400);
  assert.equal((await request("/v1/progress/events", "alice", "POST",
    { ...event, eventId:"bbc850f6-934f-42d0-8fbc-655521f0dafe", notes:"secrets" })).status,400);
});
