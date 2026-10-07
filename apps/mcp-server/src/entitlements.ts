import { neon } from "@neondatabase/serverless";
import {
  databaseUrl,
  durableDatabaseRequired,
  DurableDatabaseRequiredError,
} from "./databasePolicy.js";
import type { StudyMode } from "./contentSessions.js";

export type StudyPlan = "free" | "plus" | "unlimited";

export type UsageStatus = {
  learnerId: string;
  plan: StudyPlan;
  period: string;
  learnRounds: number;
  practiceTests: number;
  limits: {
    learnRounds: number | null;
    practiceTests: number | null;
  };
  remaining: {
    learnRounds: number | null;
    practiceTests: number | null;
  };
};

type UsageRow = {
  learnerId: string;
  plan: StudyPlan;
  period: string;
  learnRounds: number;
  practiceTests: number;
};

const PLUS_LEARN_LIMIT = 20;
const PLUS_TEST_LIMIT = 3;
const FREE_LEARN_LIMIT = Number.parseInt(
  process.env.INSTANTSTUDY_FREE_LEARN_ROUNDS ?? "5",
  10,
);
const FREE_TEST_LIMIT = Number.parseInt(
  process.env.INSTANTSTUDY_FREE_PRACTICE_TESTS ?? "1",
  10,
);

function periodKey(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function limits(plan: StudyPlan) {
  if (plan === "unlimited") {
    return { learnRounds: null, practiceTests: null };
  }

  if (plan === "plus") {
    return {
      learnRounds: PLUS_LEARN_LIMIT,
      practiceTests: PLUS_TEST_LIMIT,
    };
  }

  return {
    learnRounds: FREE_LEARN_LIMIT,
    practiceTests: FREE_TEST_LIMIT,
  };
}

function status(row: UsageRow): UsageStatus {
  const planLimits = limits(row.plan);

  return {
    learnerId: row.learnerId,
    plan: row.plan,
    period: row.period,
    learnRounds: row.learnRounds,
    practiceTests: row.practiceTests,
    limits: planLimits,
    remaining: {
      learnRounds:
        planLimits.learnRounds === null
          ? null
          : Math.max(0, planLimits.learnRounds - row.learnRounds),
      practiceTests:
        planLimits.practiceTests === null
          ? null
          : Math.max(0, planLimits.practiceTests - row.practiceTests),
    },
  };
}

export class UsageLimitError extends Error {
  readonly code = "usage_limit_reached";
  readonly statusCode = 402;

  constructor(
    readonly metric: "learn_rounds" | "practice_tests",
    readonly usage: UsageStatus,
  ) {
    super(
      metric === "learn_rounds"
        ? "Monthly Learn round limit reached for this plan."
        : "Monthly practice-test limit reached for this plan.",
    );
  }
}

interface EntitlementStore {
  get(learnerId: string): Promise<UsageRow>;
  saveUsage(row: UsageRow): Promise<void>;
  setPlan(learnerId: string, plan: StudyPlan): Promise<void>;
}

class MemoryEntitlementStore implements EntitlementStore {
  private plans = new Map<string, StudyPlan>();
  private usage = new Map<string, UsageRow>();

  async get(learnerId: string) {
    const period = periodKey();
    const key = `${learnerId}:${period}`;
    const existing = this.usage.get(key);

    if (existing) {
      return {
        ...existing,
        plan: this.plans.get(learnerId) ?? existing.plan,
      };
    }

    const row: UsageRow = {
      learnerId,
      plan: this.plans.get(learnerId) ?? "free",
      period,
      learnRounds: 0,
      practiceTests: 0,
    };
    this.usage.set(key, row);
    return row;
  }

  async saveUsage(row: UsageRow) {
    this.usage.set(`${row.learnerId}:${row.period}`, { ...row });
  }

  async setPlan(learnerId: string, plan: StudyPlan) {
    this.plans.set(learnerId, plan);
  }
}

class NeonEntitlementStore implements EntitlementStore {
  private sql;
  private ready: Promise<void>;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
    this.ready = this.init();
  }

  private async init() {
    await this.sql`
      CREATE TABLE IF NOT EXISTS instantstudy_entitlements (
        learner_id text PRIMARY KEY,
        plan text NOT NULL DEFAULT 'free',
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await this.sql`
      CREATE TABLE IF NOT EXISTS instantstudy_usage (
        learner_id text NOT NULL,
        period text NOT NULL,
        learn_rounds integer NOT NULL DEFAULT 0,
        practice_tests integer NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (learner_id, period)
      )
    `;
  }

  async get(learnerId: string) {
    await this.ready;
    const period = periodKey();

    const planRows = await this.sql`
      SELECT plan
      FROM instantstudy_entitlements
      WHERE learner_id = ${learnerId}
      LIMIT 1
    `;

    const rawPlan = planRows[0]?.plan;
    const plan: StudyPlan =
      rawPlan === "plus" || rawPlan === "unlimited" ? rawPlan : "free";

    const usageRows = await this.sql`
      SELECT learn_rounds, practice_tests
      FROM instantstudy_usage
      WHERE learner_id = ${learnerId}
        AND period = ${period}
      LIMIT 1
    `;

    return {
      learnerId,
      plan,
      period,
      learnRounds: Number(usageRows[0]?.learn_rounds ?? 0),
      practiceTests: Number(usageRows[0]?.practice_tests ?? 0),
    };
  }

  async saveUsage(row: UsageRow) {
    await this.ready;
    await this.sql`
      INSERT INTO instantstudy_usage (
        learner_id,
        period,
        learn_rounds,
        practice_tests,
        updated_at
      )
      VALUES (
        ${row.learnerId},
        ${row.period},
        ${row.learnRounds},
        ${row.practiceTests},
        now()
      )
      ON CONFLICT (learner_id, period) DO UPDATE SET
        learn_rounds = EXCLUDED.learn_rounds,
        practice_tests = EXCLUDED.practice_tests,
        updated_at = now()
    `;
  }

  async setPlan(learnerId: string, plan: StudyPlan) {
    await this.ready;
    await this.sql`
      INSERT INTO instantstudy_entitlements (learner_id, plan, updated_at)
      VALUES (${learnerId}, ${plan}, now())
      ON CONFLICT (learner_id) DO UPDATE SET
        plan = EXCLUDED.plan,
        updated_at = now()
    `;
  }
}

class UnavailableEntitlementStore implements EntitlementStore {
  private unavailable(): never {
    throw new DurableDatabaseRequiredError();
  }

  async get(_learnerId: string) {
    return this.unavailable();
  }

  async saveUsage(_row: UsageRow) {
    return this.unavailable();
  }

  async setPlan(_learnerId: string, _plan: StudyPlan) {
    return this.unavailable();
  }
}

function createEntitlementStore(): EntitlementStore {
  const url = databaseUrl();
  if (url) return new NeonEntitlementStore(url);

  return durableDatabaseRequired()
    ? new UnavailableEntitlementStore()
    : new MemoryEntitlementStore();
}

export class EntitlementService {
  constructor(
    private store: EntitlementStore = createEntitlementStore(),
  ) {}

  async getStatus(learnerId: string) {
    return status(await this.store.get(learnerId));
  }

  async consume(learnerId: string, mode: StudyMode) {
    const row = await this.store.get(learnerId);
    const before = status(row);

    if (mode === "learn") {
      if (
        before.limits.learnRounds !== null &&
        row.learnRounds >= before.limits.learnRounds
      ) {
        throw new UsageLimitError("learn_rounds", before);
      }
      row.learnRounds += 1;
    }

    if (mode === "test") {
      if (
        before.limits.practiceTests !== null &&
        row.practiceTests >= before.limits.practiceTests
      ) {
        throw new UsageLimitError("practice_tests", before);
      }
      row.practiceTests += 1;
    }

    await this.store.saveUsage(row);
    return status(row);
  }

  async setPlan(learnerId: string, plan: StudyPlan) {
    await this.store.setPlan(learnerId, plan);
    return this.getStatus(learnerId);
  }
}

export const studyEntitlements = new EntitlementService();
