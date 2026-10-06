# InstantStudy funnel — Quizlet mechanics, InstantStudy identity

## Competitive extraction

Current Quizlet mobile funnel research shows this acquisition sequence:

1. Sign-up prompt
2. Birthday and role qualification
3. Subscription paywall
4. Notification permission warm-up
5. Native notification permission
6. Introductory activation
7. Study set / flashcards
8. Learn / Test features with additional premium triggers

Primary research references:

- ScreensDesign, Quizlet 2026 flow:
  https://screensdesign.com/apps/quizlet-study-with-flashcards/
- Quizlet current Plus pricing:
  https://quizlet.com/upgrade
- Quizlet ChatGPT app:
  https://help.quizlet.com/hc/en-us/articles/44716146144909-Create-flashcard-sets-directly-in-ChatGPT
- Quizlet AI flashcard generation:
  https://quizlet.com/features/ai-flashcard-generator

The strategic mechanic is:

```
value promise
  -> identity
  -> qualification
  -> trial/paywall
  -> permission
  -> activation
  -> premium triggers at high intent
```

We intentionally do not copy Quizlet's visual assets, brand, wording, or screen layouts.

## InstantStudy adaptation

```
1. Value
   "Study where you already think."

2. Identity
   Google / email entry point

3. Learning context
   School / university / work / language

4. Desired outcome
   Remember / exam / Anki / understand

5. Source
   Connect Anki / start with study material

6. Paywall
   Adapty-driven annual vs monthly experiment
   Annual trial selected by default

7. Reminder warm-up
   Explain the value before any platform permission prompt

8. Activation
   "InstantStudy, let's study for 10 minutes."
```

## Why the paywall appears before the first full session

Quizlet monetizes early, before substantial product depth. InstantStudy keeps that principle because:

- intent is highest immediately after personalization;
- Adapty can test whether early paywall beats a post-activation paywall;
- limited access remains available so the funnel can be tested without a hard wall.

The placement remains:

```
instantstudy_main
```

Adapty remote config may control:

- headline
- CTA
- annual price label
- monthly price label
- trial label
- checkout URL

## Design translation

The implementation follows `DESIGN.md`, whose reference language comes from ElevenLabs as documented by Refero.

It uses:

- warm off-white canvas;
- light editorial typography;
- taupe learning surfaces;
- black primary pill actions;
- hairline warm borders;
- restrained blue/orange memory-state accents;
- no Quizlet blue;
- no copied Quizlet illustrations;
- no ElevenLabs logos, assets, or literal layouts.

## Funnel events

The prototype emits browser custom events:

```
instantstudy:funnel
```

with event names such as:

- `funnel_step_viewed`
- `signup_started`
- `funnel_choice`
- `paywall_cta_clicked`
- `first_session_started`

If `window.dataLayer` is present, the same events are pushed there.

## Acceptance criteria

- Funnel is usable from 320px mobile through desktop.
- One dominant action per screen.
- Back navigation works on qualification/paywall steps.
- Paywall resolves Adapty offer when backend credentials are configured.
- Funnel still renders with safe fallback pricing when Adapty is unavailable.
- Annual and monthly variants are selectable.
- Limited-access path does not block activation.
- No Quizlet trademarked UI or copied visual asset is used.
- No model-provider branding is required.
