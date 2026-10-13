import { z } from "zod";

export const products = Object.freeze(["instant_speak", "instant_study", "instant_bible"]);
export const eventKinds = Object.freeze([
  "session_completed", "review_completed", "lesson_completed",
  "practice_completed", "goal_updated",
]);

// Only shared, non-sensitive learning metrics. Never sync audio, passages,
// Bible journals, study documents, prompts or raw answers to Instant Cloud.
export const eventSchema = z.object({
  eventId: z.string().uuid(),
  product: z.enum(products),
  kind: z.enum(eventKinds),
  occurredAt: z.string().datetime({ offset: true }),
  sourceId: z.string().trim().min(1).max(200).optional(),
  metrics: z.object({
    durationSeconds: z.number().int().min(0).max(86400).optional(),
    score: z.number().min(0).max(1).optional(),
    completedUnits: z.number().int().min(0).max(10000).optional(),
  }).strict().default({}),
}).strict();

export const pageSchema = z.object({
  product: z.enum(products).optional(),
  afterId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export function validateEvent(input, now = Date.now()) {
  const value = eventSchema.parse(input);
  const timestamp = Date.parse(value.occurredAt);
  if (!Number.isFinite(timestamp) ||
      timestamp > now + 5 * 60 * 1000 ||
      timestamp < now - 366 * 24 * 60 * 60 * 1000) {
    throw new Error("event_timestamp_out_of_range");
  }
  return value;
}
