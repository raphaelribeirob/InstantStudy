# InstantStudy

**Drop anything. Learn it.**

InstantStudy turns content inside a tool-capable LLM into an adaptive study session.

Paste notes, upload a PDF, use material already in the conversation, or connect Anki. InstantStudy structures what matters, asks one question at a time, evaluates the learner's answer, adapts difficulty, tracks weak concepts, and keeps the session moving.

> Quizlet-style study mechanics, rebuilt natively for LLMs.

## Product thesis

The product is not an Anki connector.

Anki is an optional source and scheduling integration.

The core product is the **Study Engine**:

```
content
  ↓
InstantStudy
  ↓
Learn / Review / Quiz / Test
  ↓
answer
  ↓
semantic evaluation
  ↓
knowledge state
  ↓
next best question
```

## Zero-friction entry

The primary experience is:

```
upload/paste material in the LLM
        ↓
"InstantStudy"
        ↓
prepare_study
        ↓
first adaptive question
```

No deck creation. No dashboard. No mandatory onboarding before first value.

## Study modes

### Learn
Starts with support, moves toward free recall, explanation, and application. Weak answers trigger repair/retest. Strong answers increase difficulty.

### Review
Optimizes for fast active recall and weak-concept repetition.

### Quiz
Uses short question cycles with immediate grading and explanation.

### Test
Uses exam-style questions and suppresses correctness feedback until the session finishes.

## Knowledge state

Each session tracks per concept:

- mastery
- attempts
- correct / partial / incorrect
- current difficulty
- missing concepts
- last seen state

This state determines what InstantStudy asks next.

## Core MCP tools

- `prepare_study`
- `next_study_question`
- `submit_study_answer`
- `finish_study_session`
- `get_study_session`

Optional Anki tools:

- `anki_status`
- `list_decks`
- `get_due_cards`
- `search_cards`
- `create_card`
- `record_review`

Monetization:

- `get_subscription_offer`

## Content ingestion

InstantStudy can ingest text directly and extract text from supported remote PDFs/text files supplied through a host. When a host already has the document contents available, it can pass extracted text directly for maximum portability.

Image-heavy/scanned content may still require the host LLM's vision/text extraction.

## LLM compatibility

- MCP clients connect to `/mcp`.
- Other tool-capable LLMs use REST/OpenAPI under `/api/v1`.
- No study-domain code depends on OpenAI, Anthropic, or Google model SDKs.

The host LLM performs semantic interpretation and question wording. InstantStudy owns the session policy, mode behavior, mastery updates, progression, and study state.

## Monetization

Adapty controls pricing experiments through the `instantstudy_main` placement. Monetization should be presented **after first study value** for content-first users, with alternative timing tested through experimentation.

## Anki

Anki remains valuable for people who already have decks or want mature spaced-repetition scheduling.

Architecture:

```
Any LLM
   │
   ├── MCP
   └── REST/OpenAPI
          │
          ▼
   InstantStudy Study Engine
          │
     ┌────┴─────┐
     ▼          ▼
 Content     Knowledge state
                   │
                   ▼
             Optional Anki
```

Never expose AnkiConnect directly to the public internet.
