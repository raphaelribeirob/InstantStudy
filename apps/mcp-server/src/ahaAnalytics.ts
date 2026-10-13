import { createHmac } from "node:crypto";
import type { StudyAttempt } from "./studyEngine.js";

/** Only verifiable grading evidence produces learning_aha_achieved.
 * This measures assessed improvement, not proven long-term retention.
 */
export type AhaEvidence = {
  variant: "recovery" | "demonstrated_mastery";
  attemptNumber: number;
  scoreBefore?: number;
  scoreAfter: number;
  elapsedSeconds: number;
};

const performance = (attempt: StudyAttempt) =>
  attempt.correctness * 0.65 + attempt.completeness * 0.35;

export function firstAhaEvidence(
  attempts: StudyAttempt[],
  mode: string,
  startedAt: string,
  now: Date = new Date(),
): AhaEvidence | null {
  if (mode !== "learn" || attempts.length < 2) return null;
  const last = attempts[attempts.length - 1];
  const score = performance(last);
  if (last.confidence < 0.8 || score < 0.82 || last.completeness < 0.75) return null;
  const earlier = attempts.slice(0, -1);
  const previousForConcept = earlier.filter(item => item.conceptId === last.conceptId);
  const low = previousForConcept.find(item => performance(item) < 0.65);
  const elapsedSeconds = Math.max(0, Math.round((now.getTime() - Date.parse(startedAt)) / 1000));
  const alreadyRecovered = earlier.some((item, i) => {
    if (item.confidence < 0.8 || performance(item) < 0.82) return false;
    const earlierLow = earlier.slice(0, i).find(other =>
      other.conceptId === item.conceptId && performance(other) < 0.65);
    return Boolean(earlierLow && performance(item) - performance(earlierLow) >= 0.3);
  });
  if (low && score - performance(low) >= 0.3 && !alreadyRecovered) {
    return {
      variant: "recovery",
      attemptNumber: attempts.length,
      scoreBefore: Number(performance(low).toFixed(2)),
      scoreAfter: Number(score.toFixed(2)),
      elapsedSeconds,
    };
  }
  if (attempts.length === 2 && !low &&
      earlier[0].confidence >= 0.8 && performance(earlier[0]) >= 0.82 &&
      earlier[0].conceptId !== last.conceptId) {
    return {
      variant: "demonstrated_mastery",
      attemptNumber: 2,
      scoreAfter: Number(score.toFixed(2)),
      elapsedSeconds,
    };
  }
  return null;
}

const allowed = new Set([
  "study_material_imported",
  "first_question_prepared",
  "first_question_presented",
  "first_answer_graded",
  "learning_gap_detected",
  "learning_gap_retested",
  "learning_aha_achieved",
]);

/** Privacy-first PostHog ingestion is disabled until explicitly configured.
 * Never send source material, question text, answers, email or source IDs.
 * Only the backend emits verified learning events.
 */
export async function captureVerifiedActivation(
  learnerId: string | undefined,
  event: string,
  properties: Record<string, string | number | boolean | undefined> = {},
) {
  const key = process.env.INSTANTSTUDY_POSTHOG_PROJECT_KEY?.trim();
  const salt = process.env.INSTANTSTUDY_POSTHOG_ID_SALT?.trim();
  if (!learnerId || !allowed.has(event) || !key || !salt || salt.length < 32) return;
  const host = (process.env.INSTANTSTUDY_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");
  if (!/^https:\/\/(?:us|eu)\.i\.posthog\.com$/.test(host)) return;
  const distinctId = createHmac("sha256", salt).update(learnerId).digest("hex");
  const filtered = Object.fromEntries(Object.entries(properties).filter(([name, value]) =>
    /^(mode|source_type|variant|attempt_number|elapsed_seconds|score_before|score_after|question_count)$/.test(name) &&
    (typeof value === "string" || typeof value === "number" || typeof value === "boolean")));
  try {
    await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        timestamp: new Date().toISOString(),
        properties: { ...filtered, $process_person_profile: false, app: "instantstudy" },
      }),
      signal: AbortSignal.timeout(650),
    });
  } catch {
    // Analytics must never block studying; do not log source or credentials.
  }
}
