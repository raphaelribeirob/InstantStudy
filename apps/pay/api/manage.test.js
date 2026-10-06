import test from "node:test";
import assert from "node:assert/strict";

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
