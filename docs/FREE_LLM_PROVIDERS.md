# InstantStudy — Awesome Free LLM APIs integration

## Decision

The [awesome-free-llm-apis](https://github.com/mnfst/awesome-free-llm-apis) collection and the [freellm.net directory](https://github.com/open-free-llm-api/awesome-freellm-apis) are **research catalogs**, not production inference endpoints, free credit grants, gateways or permission to use provider trademarks. InstantStudy directly calls vetted provider-owned APIs; there are no unverified third-party proxy endpoints.

**No model call is guaranteed to be free**: usage policies depend on account status, available free-tier models, geography, rate limits and future provider changes. Verify free-tier terms, privacy, data retention, and project billing settings for each key before activation.

## App integration

| Study feature | Provider path | Safe fallback |
| --- | --- | --- |
| Study guides and flashcards | Groq, OpenRouter, Gemini via OpenAI-compatible Chat Completions; source evidence verified before saving | deterministic generated notes and cards |
| Ask about a document | provider chain for low-confidence extraction queries | extractive source quotes |
| Semantic short-answer correction | provider chain for ambiguous submissions; validates numeric 0–1 grade JSON | deterministic lexical feedback |
| Recorded lecture transcription | Groq Whisper Large V3 Turbo (free-tier eligible with an account) | no transcript; paid OpenAI only if explicitly enabled |
| Handwritten note/photo OCR | Gemini multimodal compatible endpoint | no OCR; paid OpenAI only if explicitly enabled |
| Live Siri Orb speech | **OpenAI Realtime remains a separate paid, authenticated WebRTC path** | no fake live conversation |
| Study history, FSRS, materials, users, metering | Neon PostgreSQL | never use Firebase or browser database credentials |

## Server-only environment variables

```text
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
GEMINI_API_KEY=...
INSTANTSTUDY_FREE_LLM_ENABLED=true
INSTANTSTUDY_FREE_LLM_ORDER=groq,openrouter,gemini
INSTANTSTUDY_FREE_AUDIO_ENABLED=true
INSTANTSTUDY_FREE_VISION_ENABLED=true
INSTANTSTUDY_ALLOW_PAID_LLM_FALLBACK=false
INSTANTSTUDY_ALLOW_PAID_AUDIO_FALLBACK=false
INSTANTSTUDY_ALLOW_PAID_VISION_FALLBACK=false
```

These belong **only on the Vercel `instantstudy-api` project**, NOT in `instantstudy-web`, `VITE_*`, mobile code, GitHub files, or the public Neon database. Leave a key blank if you don't have it. A true feature flag without a key causes a deterministic or unavailable fallback; it does **not** authorize or establish a free provider connection.

For proof of implementation, set **one** provider key first, deploy a Preview, upload a safe nonsensitive sample, then inspect `GET /health` for active `inference.textProviders` and check `material.assets.generatedBy`. Do not rely on a fake mock response or earlier Vercel deployment.

## Expected provider URLs and default model IDs

| Provider | Server-only API endpoint | Configured default |
| --- | --- | --- |
| Groq | `https://api.groq.com/openai/v1/chat/completions` | `openai/gpt-oss-20b` |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | `openai/gpt-oss-20b:free` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | `gemini-2.5-flash` (availability may differ for new projects) |

OpenRouter model IDs **must end with `:free`**. Custom provider URLs and model names are NOT accepted from user requests. Only verified key names from environment variables are read. Change model identifiers via operator-only environment variables after checking current limits and eligibility.

Provider documentation (recheck regularly):
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/speech-to-text
- https://openrouter.ai/docs/api/reference/limits
- https://ai.google.dev/gemini-api/docs/openai

## Cost protection and safety

- Free text routing only if `INSTANTSTUDY_FREE_LLM_ENABLED=true`, key exists and model ID passes validation. Maximum two attempted free providers by default, each with 9-second timeout.
- **Having an OpenAI API key for real-time voice does not automatically allow billable text, audio or vision fallbacks.** The three `INSTANTSTUDY_ALLOW_PAID_*` flags default to false.
- Parsing and validation of educational data remain on our server. A model's ungrounded flashcards fail validation; they never silently replace source-backed study data.
- Material-generated AI requests additionally consume a durable per-learner daily Neon quota (default three). Existing API authentication, account entitlements and rate limits still apply.
- Groq Whisper uses at most the existing 25 MB audio import ceiling; free-tier audio minute/hour quotas are account specific.
- User content may be transferred to **external model providers**. Add an explicit privacy disclosure and per-user consent before exposing new provider processing to real students or enabling production; do not send sensitive learner data to free providers until that review is complete.
- Data is neither persisted in the browser-side provider layer nor sent to the free-LLM directories. Actual provider-side retention is governed by provider terms, not by our source code.
- Do not confuse passing CI with testing real API calls, billing, privacy or model quality.

## Deployment status and acceptance

Initial installation adds working server adapters, provider output checks and simulated provider-failure tests. It **does not create free API keys** or a live connection to a provider on the user's behalf.

Acceptance before enabling for real learners:

1. Verify Free tier and terms on the provider account. Set `GROQ_API_KEY` or `OPENROUTER_API_KEY` in Vercel encrypted Preview env.
2. Check `GET /health` shows active provider route, with no exposed keys.
3. Generate Portuguese and English flashcards and confirm `generatedBy`, source excerpts and evidence.
4. Test provider 429/5xx, malformed JSON, exhausted quota, fallback behaviour and privacy disclosure.
5. Upload one nonsensitive lecture and one handwritten scan to ensure provider audio/OCR endpoints respond and no hidden paid usage occurs.
6. Use an actual paid-tier project budget/alert if ever enabling explicit OpenAI fallbacks.
7. Run TypeScript, JS tests, Web build, Flutter analysis/tests, security and end-to-end acceptance; release only after independent review.

Do **not** change Neon configuration, payments, app branding, Siri Orb motions or existing FSRS learning records when modifying the LLM router.
