# InstantStudy funnel — Quizlet mechanics adapted for LLMs

## Principle

InstantStudy borrows the conversion mechanics that work in Quizlet, but the LLM environment removes a major source of friction: the learner can already have the study material in the conversation.

Therefore the primary funnel is **value-first**, not signup-first.

## Content-first funnel

```
1. CONTENT
   Paste notes or upload material in the LLM

2. INTENT
   "InstantStudy" / "study this" / "quiz me"

3. FIRST VALUE
   prepare_study -> first adaptive question

4. ACTIVATION
   learner submits the first answer
   event: first_answer_submitted

5. IDENTITY
   Ask the learner to keep progress across sessions

6. OPTIONAL MEMORY
   Connect Anki if they already use it

7. MONETIZATION
   Present Adapty-selected Pro offer at a high-intent moment

8. RETENTION
   Reminder / review when knowledge is weakening
```

## Cold-start web funnel

The website also starts with content.

```
content -> choose Learn/Review/Quiz/Test -> session prepared -> account/Pro later
```

It must not require Google/email, learner role, Anki connection, or a paywall before demonstrating study value.

## What we retain from Quizlet

- fast transformation from source material into practice;
- multiple study modes over the same knowledge;
- increasing difficulty;
- immediate correction outside Test mode;
- premium triggers at moments of clear intent;
- trial/price experimentation.

## What we do not copy

- Quizlet brand, visual assets, wording, illustrations, or layouts;
- public-set marketplace as a V1 requirement;
- games as a core feature;
- teacher/classroom complexity before the learner loop works.

## Adapty

Placement:

```
instantstudy_main
```

Adapty may test:

- post-first-answer vs later paywall timing;
- monthly vs annual;
- trial length;
- pricing by audience/region;
- paywall headline and CTA.

## Design

The visual system remains the InstantStudy `DESIGN.md`:

- warm paper canvas;
- light editorial typography;
- taupe surfaces;
- black pill actions;
- restrained blue/orange cognitive signals;
- minimal chrome.

## Primary activation metric

```
first_answer_submitted
```

A signup is not activation. A prepared session is not activation. The user is activated only after participating in the learning loop.
