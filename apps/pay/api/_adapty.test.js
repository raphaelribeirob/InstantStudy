import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanCustomerUserId,
  cleanLocale,
  safeRemoteConfig,
} from "./_adapty.js";

test("customer id validation rejects unsafe input", () => {
  assert.equal(cleanCustomerUserId("anon_12345678"), "anon_12345678");
  assert.equal(cleanCustomerUserId("<script>alert(1)</script>"), "");
});

test("locale normalization is bounded", () => {
  assert.equal(cleanLocale("pt-BR"), "pt-BR");
  assert.equal(cleanLocale("../../etc/passwd"), "en");
});

test("Adapty cannot switch across Instant products", () => {
  const sameProduct = safeRemoteConfig(
    "instant_bible_pro_monthly",
    { offer_key: "instant_bible_pro_annual" },
  );
  assert.equal(sameProduct.offer_key, "instant_bible_pro_annual");

  const crossProduct = safeRemoteConfig(
    "instant_bible_pro_monthly",
    { offer_key: "instant_study_plus_annual" },
  );
  assert.equal(crossProduct.offer_key, "instant_bible_pro_monthly");
});

test("remote copy is bounded", () => {
  const result = safeRemoteConfig(
    "instant_bible_pro_monthly",
    { title: "x".repeat(300), cta: "Start my plan" },
  );
  assert.equal(result.title.length, 120);
  assert.equal(result.cta, "Start my plan");
});
