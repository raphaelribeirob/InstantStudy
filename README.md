# InstantStudy

**Study your Anki directly inside ChatGPT.**

InstantStudy is a ChatGPT-native study layer for Anki. The first product goal is deliberately narrow:

> Ask ChatGPT to study your Anki deck, answer in the conversation, get semantic feedback, and write the review result back to Anki.

## Product thesis

Quizlet made flashcards easy. Anki made spaced repetition powerful. InstantStudy makes both conversational.

The V1 does **not** try to replace Anki's scheduler. It uses Anki as the source of truth for cards and review scheduling while ChatGPT handles the study experience.

## Core loop

1. User installs the InstantStudy Anki bridge.
2. The bridge pairs with the InstantStudy backend.
3. The ChatGPT app calls InstantStudy MCP tools.
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

## Architecture

```
ChatGPT
   |
   | MCP / Apps SDK
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

## Repository

- `apps/mcp-server` — remote MCP + bridge API
- `anki-addon` — Anki-side bridge
- `docs` — architecture and product contracts
- `DESIGN.md` — existing InstantStudy design system

## Development status

This branch is the first ChatGPT + Anki foundation. Authentication, persistent queues, billing, marketplace packaging, and production deployment are intentionally deferred until the study loop is validated.

## Security rule

Never expose AnkiConnect directly to the public internet. InstantStudy's bridge must only make outbound requests to the remote backend.
