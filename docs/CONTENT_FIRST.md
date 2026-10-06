# Content-first entry

## Product rule

InstantStudy must deliver study value before onboarding.

The default entry is:

```
paste/upload content in the LLM
        ↓
"InstantStudy"
        ↓
prepare_study(...)
        ↓
Study Engine creates knowledge state
        ↓
first adaptive question
        ↓
submit_study_answer(...)
        ↓
mastery/difficulty update
        ↓
next_study_question(...)
```

No dashboard or deck creation is required. Anki is optional.

## Study Engine ownership

The host LLM owns language understanding and question wording.

InstantStudy owns:

- mode behavior;
- concept selection;
- difficulty progression;
- mastery updates;
- missing-concept state;
- repair/retest policy;
- test feedback suppression;
- session completion and weakness summary.

This makes behavior portable across different LLM hosts.

## Modes

### Learn
Guided recall -> free recall -> explanation -> application. Weak answers trigger repair/retest.

### Review
Fast active recall, prioritizing weak concepts.

### Quiz
Short question cycles with immediate grading.

### Test
Exam-style recall/application with no correctness feedback until completion.

## Files

ChatGPT-compatible hosts can pass files through `_meta["openai/fileParams"]`.

InstantStudy attempts server-side extraction for remote PDFs and text-like files. A host may also provide `contentText` directly. Image-heavy/scanned sources may require host vision/OCR.

## Activation

The activation event is:

```
first_answer_submitted
```

Signup and paywall should come after this event by default for content-first users. Adapty can test alternative monetization timing.

## Anki

Anki is an optional connector for existing decks and mature scheduling. It is not required to start or complete a content-first session.
