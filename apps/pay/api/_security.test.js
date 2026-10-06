import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  bodyWithinLimit,
  isJsonRequest,
  requestOriginAllowed,
} from "./_security.js";

test("OWASP: rejects cross-origin browser requests", () => {
  const req = {
    headers: {
      origin: "https://evil.example",
      host: "pay.instant.example",
    },
  };
  assert.equal(requestOriginAllowed(req), false);
});

test("OWASP: accepts same-origin HTTPS requests", () => {
  const req = {
    headers: {
      origin: "https://pay.instant.example",
      host: "pay.instant.example",
    },
  };
  assert.equal(requestOriginAllowed(req), true);
});

test("OWASP: requires JSON for payment APIs", () => {
  assert.equal(
    isJsonRequest({ headers: { "content-type": "application/json; charset=utf-8" } }),
    true,
  );
  assert.equal(
    isJsonRequest({ headers: { "content-type": "text/plain" } }),
    false,
  );
});

test("OWASP: bounds API request bodies", () => {
  assert.equal(bodyWithinLimit({ offer: "instant_bible_pro_annual" }), true);
  assert.equal(bodyWithinLimit({ payload: "x".repeat(9000) }), false);
});

test("OWASP: Vercel security headers are present", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url)));
  const headers = Object.fromEntries(
    config.headers[0].headers.map(({ key, value }) => [key.toLowerCase(), value]),
  );

  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.equal(headers["x-frame-options"], "DENY");
  assert.match(headers["strict-transport-security"], /max-age=/);
  assert.match(headers["content-security-policy"], /default-src 'self'/);
  assert.match(headers["content-security-policy"], /frame-ancestors 'none'/);
});
