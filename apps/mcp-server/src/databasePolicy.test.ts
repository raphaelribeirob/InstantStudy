import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  databaseUrl,
  durableDatabaseRequired,
  durableStorageMode,
} from "./databasePolicy.js";

const previous = {
  DATABASE_URL: process.env.DATABASE_URL,
  INSTANTSTUDY_REQUIRE_DATABASE: process.env.INSTANTSTUDY_REQUIRE_DATABASE,
  VERCEL: process.env.VERCEL,
  NODE_ENV: process.env.NODE_ENV,
};

afterEach(() => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("production requires durable database by default", () => {
  delete process.env.DATABASE_URL;
  delete process.env.INSTANTSTUDY_REQUIRE_DATABASE;
  process.env.NODE_ENV = "production";
  delete process.env.VERCEL;

  assert.equal(durableDatabaseRequired(), true);
  assert.equal(durableStorageMode(), "unavailable");
});

test("local development may use memory when explicitly not required", () => {
  delete process.env.DATABASE_URL;
  process.env.INSTANTSTUDY_REQUIRE_DATABASE = "false";
  process.env.NODE_ENV = "development";
  delete process.env.VERCEL;

  assert.equal(durableDatabaseRequired(), false);
  assert.equal(durableStorageMode(), "memory");
});

test("configured database selects Neon storage", () => {
  process.env.DATABASE_URL = "configured";
  process.env.INSTANTSTUDY_REQUIRE_DATABASE = "true";

  assert.equal(databaseUrl(), "configured");
  assert.equal(durableStorageMode(), "neon");
});
