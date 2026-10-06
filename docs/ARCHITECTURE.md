# InstantStudy Architecture — V1

## Goal

Let a user study their real Anki collection directly inside a ChatGPT conversation without migrating decks or replacing Anki's scheduler.

## Components

### 1. ChatGPT app

Built with the OpenAI Apps SDK / MCP model. It exposes narrow tools to the model rather than a generic remote-code interface.

### 2. InstantStudy MCP server

Remote TypeScript service. Responsibilities:

- expose MCP tools;
- validate tool inputs;
- translate tools into AnkiConnect actions;
- enqueue commands for a paired device;
- wait for results;
- normalize AnkiConnect responses;
- never expose arbitrary AnkiConnect methods to the model.

### 3. Anki bridge

Runs on the user's computer as an Anki add-on.

V1 responsibilities:

- store a device id and bridge token;
- poll the InstantStudy backend for commands;
- forward approved commands to local AnkiConnect;
- return the result to the backend;
- display connection state in Anki.

The V1 bridge depends on AnkiConnect. A later release may replace that dependency with direct Anki collection APIs.

### 4. Anki / AnkiConnect

Anki remains the source of truth for:

- decks;
- notes;
- cards;
- due state;
- scheduler;
- review history.

## Request flow

```
ChatGPT calls get_due_cards
        |
        v
MCP server validates deck/limit
        |
        v
Bridge queue creates command
        |
        v
Anki add-on polls /bridge/poll
        |
        v
Local request to AnkiConnect
        |
        v
Anki returns cards
        |
        v
Bridge posts result
        |
        v
MCP tool returns structured data
        |
        v
ChatGPT asks the learner one question
```

## Tool boundary

The model gets only explicit study tools.

Allowed V1 operations:

- connectivity status;
- list decks;
- retrieve due cards;
- search notes/cards;
- create a basic card;
- answer/review a card.

Not allowed:

- arbitrary AnkiConnect method execution;
- file-system access;
- arbitrary shell commands;
- add-on installation through the MCP tool;
- destructive bulk operations.

## Study semantics

The MCP server does not judge free-text answers. ChatGPT performs semantic evaluation from:

- card front;
- expected answer;
- user's answer;
- optional deck/context.

Then it maps the result to Anki's four review buttons:

- 1 = Again
- 2 = Hard
- 3 = Good
- 4 = Easy

The model should prefer conservative grading and explain material omissions before recording a review.

## Production evolution

V1 uses in-memory queues for development.

Production should add:

- OAuth/account authentication;
- encrypted device pairing;
- Postgres/Neon for accounts and device registry;
- Redis or durable queue for commands;
- explicit write-action confirmation where required;
- rate limits;
- audit log;
- device revocation;
- zero-retention handling for card contents where possible.

## Principle

**Anki is a connector, not InstantStudy's identity.**

The product is the conversational study loop inside ChatGPT.
