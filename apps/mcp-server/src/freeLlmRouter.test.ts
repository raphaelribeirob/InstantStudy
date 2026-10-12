import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  completeStudyText, freeTextProvidersConfigured, textProviderOrder,
} from "./freeLlmRouter.js";

const envKeys = [
  "INSTANTSTUDY_FREE_LLM_ENABLED", "INSTANTSTUDY_ALLOW_PAID_LLM_FALLBACK",
  "GROQ_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY",
  "INSTANTSTUDY_OPENROUTER_MODEL", "INSTANTSTUDY_FREE_LLM_ORDER",
  "INSTANTSTUDY_FREE_LLM_MAX_ATTEMPTS",
] as const;
const baseline = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
afterEach(() => {
  for (const key of envKeys) {
    const value = baseline[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  globalThis.fetch = originalFetch;
});

test("paid OpenAI credential alone does not enable billed text inference", () => {
  for (const name of envKeys) delete process.env[name];
  process.env.OPENAI_API_KEY = "sk-paid-test-secret";
  assert.deepEqual(textProviderOrder(), []);
  assert.deepEqual(freeTextProvidersConfigured(), []);
});

test("free providers use pinned hosts, configured keys, and never paid OpenRouter models", () => {
  for (const name of envKeys) delete process.env[name];
  process.env.INSTANTSTUDY_FREE_LLM_ENABLED = "true";
  process.env.GROQ_API_KEY = "groq-demo-credential";
  process.env.OPENROUTER_API_KEY = "openrouter-demo-credential";
  process.env.INSTANTSTUDY_FREE_LLM_ORDER = "groq,openrouter,groq,evil-provider";
  assert.deepEqual(textProviderOrder(), ["groq", "openrouter"]);
  process.env.INSTANTSTUDY_OPENROUTER_MODEL = "some-provider/premium-paid";
  assert.deepEqual(textProviderOrder(), ["groq"]);
});

test("Groq 429 fails over once to free OpenRouter and preserves provider attribution", async () => {
  for (const name of envKeys) delete process.env[name];
  process.env.INSTANTSTUDY_FREE_LLM_ENABLED = "true";
  process.env.GROQ_API_KEY = "groq-demo-credential";
  process.env.OPENROUTER_API_KEY = "openrouter-demo-credential";
  process.env.OPENAI_API_KEY = "sk-paid-test-secret";
  const urls: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    urls.push(String(url));
    assert.ok(String(url).startsWith("https://"));
    assert.ok(!JSON.stringify(options?.body || "").includes("sk-paid-test-secret"));
    if (String(url).includes("api.groq.com")) return new Response("rate limited", { status: 429 });
    const body = JSON.parse(String(options?.body)) as { model: string; messages: unknown[] };
    assert.ok(body.model.endsWith(":free"));
    assert.equal(body.messages.length, 2);
    return new Response(JSON.stringify({
      choices: [{ message: { content: '{"correctness":0.75}' } }],
    }), { status: 200 });
  }) as typeof fetch;
  const result = await completeStudyText({
    system: "Return JSON",
    user: "Untrusted source text",
    maxTokens: 150,
    accept: text => JSON.parse(text).correctness === 0.75,
  });
  assert.equal(result?.provider, "openrouter");
  assert.equal(urls.length, 2);
  assert.ok(urls[1].startsWith("https://openrouter.ai/"));
  assert.ok(urls.every(url => !url.includes("api.openai.com")));
});

test("invalid AI answers never bypass validation or trigger paid fallback without opt-in", async () => {
  for (const name of envKeys) delete process.env[name];
  process.env.INSTANTSTUDY_FREE_LLM_ENABLED = "true";
  process.env.GROQ_API_KEY = "groq-demo-credential";
  process.env.OPENAI_API_KEY = "sk-paid-test-secret";
  let count = 0;
  globalThis.fetch = (async () => {
    count++;
    return new Response(JSON.stringify({ choices: [{ message: { content: "unsupported data" } }] }), { status: 200 });
  }) as typeof fetch;
  const result = await completeStudyText({
    system: "Return source backed text", user: "Some document", maxTokens: 200,
    accept: text => text.includes("real evidence"),
  });
  assert.equal(result, null);
  assert.equal(count, 1);
});
