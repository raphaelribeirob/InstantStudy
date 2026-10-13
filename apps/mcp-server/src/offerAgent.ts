import { schemaManagedExternally } from "./databasePolicy.js";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { databaseUrl, durableDatabaseRequired, DurableDatabaseRequiredError } from "./databasePolicy.js";
import type { StudyMaterial } from "./materialStore.js";
import type { StudyEngine } from "./studyEngine.js";

export type OfferAgentCapability =
  | "guide" | "flashcards" | "ask" | "learn" | "test"
  | "review" | "audio" | "game" | "friends";
export type OfferAgentStep = {
  id: string;
  capability: OfferAgentCapability;
  label: string;
  purpose: string;
  status: "pending" | "completed";
  completion?: { kind: "acknowledgement" | "graded-session"; at: string; studySessionId?: string };
};
export type OfferAgentPlan = {
  id: string;
  learnerId: string;
  materialId: string;
  materialTitle: string;
  goal: string;
  deadline?: string;
  status: "active" | "completed";
  steps: OfferAgentStep[];
  createdAt: string;
  updatedAt: string;
};
type PlanInput = { learnerId: string; material: StudyMaterial; goal: string; deadline?: string };
const labels: Record<OfferAgentCapability, [string, string]> = {
  guide: ["Entender a matéria", "Ler o guia estruturado da fonte"],
  flashcards: ["Recordar conceitos", "Praticar cartões gerados a partir do material"],
  ask: ["Tirar dúvidas", "Pedir uma explicação fundamentada na fonte"],
  learn: ["Aprender ativamente", "Responder perguntas adaptadas e corrigidas"],
  test: ["Simular a avaliação", "Concluir um teste real com nota registrada"],
  review: ["Revisar com FSRS", "Revisar conceitos vencidos, com registro no motor de estudo"],
  audio: ["Revisar em áudio", "Ouvir o podcast montado a partir do material"],
  game: ["Praticar jogando", "Treinar associação de conceitos"],
  friends: ["Estudar em grupo", "Criar ou entrar em uma sala de estudo"],
};

/** The actual Quizlet offer determines the skills. No fictional agent personas. */
export function buildOfferSteps(goal: string, dueCount = 0): OfferAgentStep[] {
  const exam = /\b(exam|test|prova|simulado|vestibular|enem|mcat|certifica)/i.test(goal);
  const listening = /\b(podcast|audio|ouvir|listening|caminhada|viagem)/i.test(goal);
  const groups = /\b(amigos|turma|grupo|friends|group|classe|equipe)/i.test(goal);
  const study: OfferAgentCapability[] = [
    "guide", "flashcards", "ask", "learn",
    ...(dueCount ? ["review" as const] : []),
    ...(exam ? ["test" as const] : []),
    ...(listening ? ["audio" as const] : []),
    ...(!exam ? ["test" as const] : []),
    ...(!dueCount ? ["review" as const] : []),
    ...(groups ? ["friends" as const] : []),
    "game",
  ];
  return [...new Set(study)].map((capability, i) => ({
    id: `step-${i + 1}`, capability,
    label: labels[capability][0], purpose: labels[capability][1], status: "pending",
  }));
}

export function recommendOfferNext(
  plan: OfferAgentPlan,
  context: { dueCount: number; weakConcepts: string[] },
) {
  if (plan.status === "completed") return { next: null, reason: "Plano concluído." };
  const pending = plan.steps.filter(s => s.status === "pending");
  // An overdue review is a validated Study Engine priority, not a claim of learned content.
  const review = pending.find(s => s.capability === "review");
  if (context.dueCount > 0 && review) {
    return { next: review, reason: `${context.dueCount} conceitos aguardam revisão FSRS.` };
  }
  const next = pending[0] || null;
  const reason = context.weakConcepts.length && next?.capability === "learn"
    ? `Dificuldades identificadas: ${context.weakConcepts.slice(0, 3).join(", ")}.`
    : next ? next.purpose : "Plano concluído.";
  return { next, reason };
}

export interface OfferPlanStore {
  create(input: PlanInput, dueCount: number): Promise<OfferAgentPlan>;
  getActive(learnerId: string, materialId: string): Promise<OfferAgentPlan | null>;
  complete(
    learnerId: string, planId: string, stepId: string,
    proof: { kind: "acknowledgement" | "graded-session"; studySessionId?: string },
  ): Promise<OfferAgentPlan>;
}
export const GRADED_CAPABILITIES = new Set<OfferAgentCapability>(["learn", "test", "review"]);
const isoNow = () => new Date().toISOString();
function makePlan(input: PlanInput, dueCount: number): OfferAgentPlan {
  const now = isoNow();
  return {
    id: randomUUID(), learnerId: input.learnerId, materialId: input.material.id,
    materialTitle: input.material.title, goal: input.goal.trim(),
    deadline: input.deadline, status: "active",
    steps: buildOfferSteps(input.goal, dueCount), createdAt: now, updatedAt: now,
  };
}
function finishStep(plan: OfferAgentPlan, stepId: string, proof: {
  kind: "acknowledgement" | "graded-session"; studySessionId?: string;
}) {
  const next = structuredClone(plan);
  const step = next.steps.find(s => s.id === stepId);
  if (!step) throw new Error("agent_step_not_found");
  if (step.status === "completed") return plan;
  if (GRADED_CAPABILITIES.has(step.capability) !== (proof.kind === "graded-session")) {
    throw new Error("agent_step_requires_graded_proof");
  }
  step.status = "completed";
  step.completion = { kind: proof.kind, studySessionId: proof.studySessionId, at: isoNow() };
  next.updatedAt = isoNow();
  if (next.steps.every(s => s.status === "completed")) next.status = "completed";
  return next;
}

export class MemoryOfferPlanStore implements OfferPlanStore {
  private rows = new Map<string, OfferAgentPlan>();
  async create(input: PlanInput, dueCount: number) {
    const plan = makePlan(input, dueCount);
    this.rows.set(plan.id, structuredClone(plan));
    return plan;
  }
  async getActive(learnerId: string, materialId: string) {
    const rows = [...this.rows.values()].filter(x =>
      x.learnerId === learnerId && x.materialId === materialId && x.status === "active");
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return rows[0] ? structuredClone(rows[0]) : null;
  }
  async complete(learnerId: string, planId: string, stepId: string, proof: {
    kind: "acknowledgement" | "graded-session"; studySessionId?: string;
  }) {
    const old = this.rows.get(planId);
    if (!old || old.learnerId !== learnerId) throw new Error("agent_plan_not_found");
    const next = finishStep(old, stepId, proof);
    this.rows.set(planId, structuredClone(next));
    return next;
  }
}

class NeonOfferPlanStore implements OfferPlanStore {
  private sql;
  private ready: Promise<void>;
  constructor(url: string) {
    this.sql = neon(url);
    this.ready = this.init();
  }
  private async init() {
    if (schemaManagedExternally()) return;
    await this.sql`
      CREATE TABLE IF NOT EXISTS instantstudy_agent_plans (
        id uuid PRIMARY KEY,
        learner_id text NOT NULL,
        material_id uuid NOT NULL,
        status text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        plan_json jsonb NOT NULL
      )
    `;
    await this.sql`
      CREATE INDEX IF NOT EXISTS instantstudy_agent_plans_learner_idx
      ON instantstudy_agent_plans (learner_id, material_id, updated_at DESC)
    `;
  }
  async create(input: PlanInput, dueCount: number) {
    await this.ready;
    const plan = makePlan(input, dueCount);
    await this.sql`
      INSERT INTO instantstudy_agent_plans
        (id, learner_id, material_id, status, plan_json)
      VALUES
        (${plan.id}::uuid, ${plan.learnerId}, ${plan.materialId}::uuid, ${plan.status}, ${JSON.stringify(plan)}::jsonb)
    `;
    return plan;
  }
  async getActive(learnerId: string, materialId: string) {
    await this.ready;
    const rows = await this.sql`
      SELECT plan_json FROM instantstudy_agent_plans
      WHERE learner_id = ${learnerId} AND material_id = ${materialId}::uuid
        AND status = 'active'
      ORDER BY updated_at DESC LIMIT 1
    `;
    return (rows[0]?.plan_json as OfferAgentPlan | undefined) || null;
  }
  async complete(learnerId: string, planId: string, stepId: string, proof: {
    kind: "acknowledgement" | "graded-session"; studySessionId?: string;
  }) {
    await this.ready;
    const rows = await this.sql`
      SELECT plan_json FROM instantstudy_agent_plans
      WHERE id = ${planId}::uuid AND learner_id = ${learnerId} LIMIT 1
    `;
    if (!rows.length) throw new Error("agent_plan_not_found");
    const plan = finishStep(rows[0].plan_json as OfferAgentPlan, stepId, proof);
    const updated = await this.sql`
      UPDATE instantstudy_agent_plans
      SET plan_json = ${JSON.stringify(plan)}::jsonb,
          status = ${plan.status}, updated_at = now()
      WHERE id = ${planId}::uuid AND learner_id = ${learnerId}
        AND (plan_json->>'updatedAt') = ${(rows[0].plan_json as OfferAgentPlan).updatedAt}
      RETURNING id
    `;
    if (!updated.length) throw new Error("agent_plan_concurrent_update_retry");
    return plan;
  }
}

class UnavailableOfferPlanStore implements OfferPlanStore {
  async create(_input: PlanInput, _dueCount: number): Promise<OfferAgentPlan> {
    throw new DurableDatabaseRequiredError();
  }
  async getActive(_learnerId: string, _materialId: string): Promise<OfferAgentPlan | null> {
    throw new DurableDatabaseRequiredError();
  }
  async complete(_learnerId: string, _planId: string, _stepId: string, _proof: {
    kind: "acknowledgement" | "graded-session"; studySessionId?: string;
  }): Promise<OfferAgentPlan> {
    throw new DurableDatabaseRequiredError();
  }
}
export function createOfferPlanStore(): OfferPlanStore {
  const url = databaseUrl();
  if (url) return new NeonOfferPlanStore(url);
  return durableDatabaseRequired() ? new UnavailableOfferPlanStore() : new MemoryOfferPlanStore();
}

export async function offerPlanStatus(
  plan: OfferAgentPlan, study: Pick<StudyEngine, "dueReviews" | "insights">,
) {
  const [due, insights] = await Promise.all([
    study.dueReviews(plan.learnerId, { before: isoNow(), limit: 30 }),
    study.insights(plan.learnerId),
  ]);
  const weak = insights.weakConcepts.map(c => c.label);
  return {
    plan,
    recommendation: recommendOfferNext(plan, {
      dueCount: due.filter(d => d.title === plan.materialTitle).length,
      weakConcepts: [...new Set(weak)].slice(0, 5),
    }),
  };
}
