# Content-first entry

## Product rule

InstantStudy should never force onboarding before value.

The default entry is:

```
paste/upload content in the LLM
        ↓
"study this with InstantStudy"
        ↓
prepare_study(...)
        ↓
session ready
        ↓
first question
```

No dashboard is required. No deck creation is required. Anki is optional at the start.

## ChatGPT behavior

ChatGPT plugins can receive files as tool inputs using `_meta["openai/fileParams"]`.

InstantStudy therefore exposes a `prepare_study` tool whose top-level `files` field accepts ChatGPT file references.

The model should call it whenever the learner:

- uploads a PDF/document/image and asks to study it;
- pastes notes and asks to learn/review them;
- says "InstantStudy this";
- asks for a quiz/test based on content in the conversation.

## Important constraint

Uploading a file by itself is not treated as permission to start a study workflow. The learner should express study intent, even if that intent is only:

```
InstantStudy
```

or:

```
study this
```

This avoids hijacking unrelated file uploads.

## Session behavior

The host LLM does the reasoning:

1. inspect the supplied content;
2. create a content session;
3. ask one question at a time;
4. evaluate the learner's answer semantically;
5. explain only after the attempt;
6. adapt difficulty;
7. optionally save durable cards to Anki.

InstantStudy stores the session identity and source references. Anki remains optional until the learner wants durable scheduling.

## Funnel implication

The acquisition funnel becomes a fallback, not the front door.

### Content-first user

```
content -> first study value -> identity -> optional Anki -> monetization
```

### Cold-start user

```
landing -> goal -> source -> first study value -> monetization
```

The old sequence that placed the paywall before first study value should be tested against this content-first variant, not assumed to be optimal.

## Conversion event

The key activation metric is no longer "completed onboarding".

It is:

```
first_answer_submitted
```

A user has activated only after answering the first InstantStudy question.
