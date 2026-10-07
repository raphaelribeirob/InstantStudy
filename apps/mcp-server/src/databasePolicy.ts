export class DurableDatabaseRequiredError extends Error {
  readonly code = "durable_database_required";
  readonly statusCode = 503;

  constructor() {
    super(
      "Durable Neon storage is required in this environment, but DATABASE_URL is not configured.",
    );
  }
}

function explicitRequirement() {
  const value = process.env.INSTANTSTUDY_REQUIRE_DATABASE?.trim().toLowerCase();
  if (!value) return undefined;
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return undefined;
}

export function durableDatabaseRequired() {
  const explicit = explicitRequirement();
  if (explicit !== undefined) return explicit;

  return Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");
}

export function databaseUrl() {
  return process.env.DATABASE_URL?.trim() || "";
}

export function durableStorageMode() {
  if (databaseUrl()) return "neon" as const;
  return durableDatabaseRequired() ? ("unavailable" as const) : ("memory" as const);
}

export function requireDurableDatabase() {
  if (durableStorageMode() === "unavailable") {
    throw new DurableDatabaseRequiredError();
  }
}
