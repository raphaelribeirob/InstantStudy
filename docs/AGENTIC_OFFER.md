# InstantStudy Órbita — agentic capability map aligned to the Quizlet Sensor Tower offer

**Source of truth:** current US app listing [Sensor Tower Quizlet iOS](https://app.sensortower.com/overview/546473125?country=US), together with published Quizlet features for lecture recording, AI study tools, personalized Learn, Ask, Study Groups and podcasts. The offer is a **set of learning outcomes**, not a specification to fabricate fictional autonomous characters.

## One Orb, nine bounded offer skills

| Actual marketed promise | InstantStudy capability | Execution | What it is NOT |
| --- | --- | --- | --- |
| Audio Recording → study tools | Material import with optional Groq Whisper transcription, studyAssetIntelligence | On user-authorized upload; creates sourced material, guide, flashcards | Not background recording or live autonomous class transcription |
| Study Guides | `guide` | Display sourced outlines/explanations of selected material | Not a separately trained autonomous agent |
| Flashcards | `flashcards` | Display / flip material-derived cards | Flip does not imply learned or graded |
| Ask Quizlet | `ask` | Existing grounded Q&A workspace with provider validation | No autonomous edits to saved material |
| Learn / adaptive practice | `learn` | Real StudyEngine + authenticated grading + FSRS | The LLM cannot invent scores or mark completion |
| Practice Tests | `test` | Configurable real test, server-checked completion | Opening test screen is not a completed test |
| Spaced Repetition / Retention Insights | `review` | Real due review queue / FSRS / estimated mastery | Retention score is an estimate, not measured recall probability |
| Podcasts | `audio` | Existing scripted, TTS-based material review | Not downloadable recorded audio |
| Games / Charms | `game` | Existing pair matching with material-derived prompts | Not equivalent to Quizlet's entire suite of games |
| Study with friends | `friends` | Existing invited group/room workflows | No automatic unsolicited invitations |
| Learning goal across tools | **Órbita coordinator** | Persist goal and plan, prioritize due reviews, select next real action, verify graded proof before completion | Not a fully autonomous multi-agent model or unbounded agent loop |

## Architecture

```text
Student goal + chosen material (authenticated account)
     │
     ▼
Órbita study coordinator (server-owned plan, bounded deterministic policy)
     │
     ├─ Content outcomes: guide, flashcards, grounded Ask
     ├─ Adaptive outcomes: Learn, Test, Review (StudyEngine + FSRS)
     └─ Optional outcomes: Podcast, Game, Friends (on user intent)
     │
     ▼
Neon plan state and provenance, tied to verified learner + source material
     │
     ▼
Recommendation computed from actual due reviews and weak concepts
     │
     ▼
Student clicks the recommended activity
     │
     ▼
Real learning module executes
     │
     ▼
Manual acknowledgement for media/reading OR
verified completed graded StudyEngine session for Learn/Test/Review
```

No generic agent can call `submit_study_answer` or write a score through this new orchestrator. The server checks material ownership, plan ownership, submitted session ownership, mode, matching material title, completed status and nonzero answers before marking a graded milestone. Reading a guide or visiting a podcast is tracked only as an **acknowledgement** and never upgrades mastery.

The `goal` accepts typed student intent, including exam, audio-first and group study. The controller makes deterministic recommendations from completed plan steps and real FSRS due entries. It is a first-stage **agentic workflow coordinator**, not a general LLM planner. The created deadline is saved but is not yet a timed reminder/scheduling system.

## Source code

- `apps/mcp-server/src/offerAgent.ts`: offer-specific bounded planner, recommendation policy, store abstraction, Neon/Local store and provenance checks
- `apps/mcp-server/src/server.ts`: authorized business operations `/api/v1/agent/plan/create`, `get`, `complete`, server-side grade proof validation
- `apps/web/api/study.js`: payment-account identity verification before forwarding plan operations
- `apps/web/src/study.ts`: typed learner workflow client
- `apps/web/src/OrbitaSystem.tsx`: one Sirius/ElevenLabs-inspired Orb with inline goal, plan steps and next recommended action
- `apps/web/src/orbital-agent.css`: refero/eggshell styling; no new avatar or second Orb
- `apps/mcp-server/src/studyEngine.ts`: completed-session persisted state when real last answer is submitted, so server can distinguish exercise from an abandoned attempt
- `apps/mcp-server/src/offerAgent.test.ts`: safety, prioritization, identity, goal-to-feature mapping

## Security and operational boundaries

- Accounts must be verified by the InstantPay entitlement API; anonymous visitors can use other existing free offers but cannot create a persisted agent goal.
- Backend-only service API key; Neon never exposed to React or Flutter.
- Agent actions do not automatically pay, invite friends, export files, start recording or change other students' data.
- Only server-authorized plan updates, no user-supplied score/proficiency claim.
- Existing voice integration only navigates to tools and reads basic context. It does **not** call this planner and cannot grade via voice.
- No proactive notifications, scheduled tasks or background work have been installed. The current loop advances when the learner uses the app.
- Free LLM routing remains opt-in, without configured Groq/OpenRouter/Gemini keys on current Vercel preview. Agent planning is deterministic and does not depend on LLM availability.

## Acceptance gates

1. Sign in to a real account, import course material, ask for a test study goal and see goal + plan in the same Orb.
2. Verify that a daily FSRS review moves above a pending practice step only if review work is due.
3. Selecting guide/podcast/game opens the real source-backed workspace. Marking media as explored must not write a grade.
4. Learn/Test/Review completion cannot be recorded with a user-supplied fake score or any incomplete/wrong-learner/wrong-mode/wrong-material Study Engine session ID.
5. After completing a real session, the backend persists the completed status and plan advances using verified proof.
6. Reloading on the same verified account and selected material reloads the active plan from Neon.
7. Negative cases: anonymous requests 401; forged learner identity 401; arbitrary material ID 404; missing/invalid session proof 409; simultaneous plan update returns retry rather than losing data.
8. Passing TypeScript/JS/Flutter/OWASP tests is necessary but insufficient. Test real Neon, API account identity, user workflows, mobility, touch access, and external provider consent in preview before merge.
9. Do not publish claims of fully autonomous agent delivery or 1:1 Quizlet feature completeness until such end-to-end testing and missing modules are implemented.

## Remaining offer parity work

- From lecture audio to automatically created editable practice questions in a single real-time robust pipeline
- Quality evaluation of generated questions and source attribution
- Persisted transcript-based Ask conversations that can create editable study materials
- Downloadable audio podcast episodes and background mobile playback
- Gamified Charms with progression, not just pair matching
- Live collaborative room activities
- Goal deadline execution and notifications with opt-in; native Flutter parity with Web plan UI
- Improved per-learner MCP authorization beyond single-tenant bearer setup

**Release:** PR remains draft, feature branch only. Changes are not production-deployed or end-to-end proven until separately checked.
