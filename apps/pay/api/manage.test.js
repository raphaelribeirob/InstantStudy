import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import manage from "./manage.js";

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[String(key).toLowerCase()] = String(value);
    },
    end(body = "") {
      this.body = body;
      return this;
    },
  };
}

test("manage fails closed without self-service portal", () => {
  const previous = process.env.PADDLE_CUSTOMER_PORTAL_URL;
  delete process.env.PADDLE_CUSTOMER_PORTAL_URL;

  const res = response();
  manage({ method: "GET" }, res);
  assert.equal(res.statusCode, 503);

  if (previous) process.env.PADDLE_CUSTOMER_PORTAL_URL = previous;
});

test("manage redirects only to configured HTTPS portal", () => {
  const previous = process.env.PADDLE_CUSTOMER_PORTAL_URL;
  process.env.PADDLE_CUSTOMER_PORTAL_URL =
    "https://customer-portal.paddle.com/example";

  const res = response();
  manage({ method: "GET" }, res);
  assert.equal(res.statusCode, 302);
  assert.equal(
    res.headers.location,
    "https://customer-portal.paddle.com/example",
  );

  if (previous) {
    process.env.PADDLE_CUSTOMER_PORTAL_URL = previous;
  } else {
    delete process.env.PADDLE_CUSTOMER_PORTAL_URL;
  }
});


test("InstantBible checkout is fail-closed until authenticated entitlement exists", () => {
  const source = readFileSync(new URL("./checkout.js", import.meta.url), "utf8");
  assert.match(source, /instant_bible:\s*false/);
  assert.match(source, /entitlement_not_configured/);
});
