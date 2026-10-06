# InstantStudy

**Study your Anki directly inside any tool-capable LLM.**

InstantStudy is an LLM-native study layer for Anki. ChatGPT is the first distribution surface, but the core is provider-neutral. The first product goal is deliberately narrow:

> Ask ChatGPT to study your Anki deck, answer in the conversation, get semantic feedback, and write the review result back to Anki.

## Product thesis

Quizlet made flashcards easy. Anki made spaced repetition powerful. InstantStudy makes both conversational.

The V1 does **not** try to replace Anki's scheduler. It uses Anki as the source of truth for cards and review scheduling while ChatGPT handles the study experience.

## Core loop

1. User installs the InstantStudy Anki bridge.
2. The bridge pairs with the InstantStudy backend.
3. ChatGPT, Claude, another MCP client, or a REST/OpenAPI tool client calls InstantStudy.
4. The backend dispatches commands to the paired Anki client.
5. ChatGPT asks one question at a time.
6. The user answers naturally.
7. ChatGPT evaluates correctness and completeness.
8. InstantStudy records the review in Anki.
9. The next due card is selected.

## V1 tools

- `anki_status`
- `list_decks`
- `get_due_cards`
- `search_cards`
- `create_card`
- `record_review`
- `get_subscription_offer`

## Architecture

```
LLM client
   |
   | MCP or REST/OpenAPI
   v
InstantStudy MCP Server
   |
   | command queue
   v
InstantStudy Anki Bridge
   |
   | localhost:8765
   v
AnkiConnect
   |
   v
Anki
```

The bridge makes an outbound connection/poll to the InstantStudy server, so the user's Anki does not need to expose a public port.

## Monetization

Adapty is integrated as the pricing experimentation control plane. The server resolves the active offer from the `instantstudy_main` placement, so audiences, localized offers, products, and A/B price tests can change without deploying new InstantStudy code.

Stripe remains the default payment rail.

## LLM compatibility

- MCP clients: connect to `/mcp`.
- Other tool-capable LLMs: use the REST API under `/api/v1`.
- OpenAPI contract: `/openapi.yaml`.

No study-domain code depends on an OpenAI, Anthropic, or Google model SDK.

## Repository

- `apps/mcp-server` — remote MCP + bridge API
- `anki-addon` — Anki-side bridge
- `docs` — architecture and product contracts
- `DESIGN.md` — existing InstantStudy design system

## Development status

This branch is the first ChatGPT + Anki foundation. Authentication, persistent queues, billing, marketplace packaging, and production deployment are intentionally deferred until the study loop is validated.

## Security rule

Never expose AnkiConnect directly to the public internet. InstantStudy's bridge must only make outbound requests to the remote backend.
