# InstantStudy — Open Source Gap Register

**Date:** 2026-10-12 | **Purpose:** audit and reuse mature OSS before writing bespoke code | **Policy:** **candidate != installed, reviewed or approved**.

Do not copy Quizlet brand, screenshots, proprietary code or licensed study content. Do not include a new production dependency until license compatibility, operational cost and security review have been completed.

| Offer gaps | Candidate project(s) | Evaluation target | Current decision |
| --- | --- | --- | --- |
| PDF/Word/PPTX, complex tables | [Docling](https://github.com/docling-project/docling), [MarkItDown](https://github.com/microsoft/markitdown) | Real lecture PDFs, scanned diagrams, equation preservation, Python worker overhead | **PoC required** |
| 17-language OCR / handwriting | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Mobile camera notes, non-Latin scripts, formulas, CPU/GPU cost | **PoC required** |
| Long lecture transcription | [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Word-error rate, timestamps, speed, privacy and hourly compute cost | **PoC required** |
| Durable review scheduling | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | Inspect existing FSRS; memory stability and migration compatibility | **Audit installed code first** |
| Rich flashcard/guide editor | [Tiptap](https://github.com/ueberdosis/tiptap) | Math, image hotspots, a11y, React + native Flutter bridge | **PoC required** |
| Diagram labels / media | [H5P](https://github.com/h5p) | Determine component-level license; diagram/task accessibility | **License + PoC required** |
| Games Match/Blast/Blocks | [H5P](https://github.com/h5p), optional custom canvas/game engine | Existing matching mode is NOT equivalent to all games; physics/game UX custom | **Research required** |
| Class group presence / edits | [Yjs](https://github.com/yjs/yjs) | Authorize rooms, server durable sync, conflict handling, cost | **PoC required** |
| Classroom audio/video | [Jitsi Meet](https://github.com/jitsi/jitsi-meet) | Optional only if classroom requirements prove voice sessions essential | **Defer pending need** |
| Translations/QA | [Weblate](https://github.com/WeblateOrg/weblate) | Deployment architecture, copyleft obligations, translator workflows | **Licensing review** |
| Teacher workflows | [Open edX](https://github.com/openedx/openedx-platform) | Reference requirements, do not embed whole LMS or ignore copyleft | **Architecture reference only** |
| Offline secure cache | Native SQLite/local encrypted storage + app-level sync | Cache is not a second server DB; signed offline entitlements, revocation window | **Architecture design required** |
| Public learning catalog | Open educational resources: OpenStax, OER Commons (license per asset) | Attribution, redistribution, commercial use, content quality and takedown | **Rights review** |
| Expert solutions | Only owned or contractually licensed verified solutions | Provenance, human editorial review and reusable rights | **External content blocker** |
| Multi-model generation | Existing Groq/OpenRouter/Gemini free-first provider router | Per-locale provider testing, fallback accuracy, tokens per minute, quotas | **Audit existing implementation** |

## Required decision record per candidate

- **Feature IDs and user acceptance:** precisely which parity acceptance rows this dependency is meant to satisfy.
- **Repository and pinned version/commit:** README, activity cadence, maintenance risk, release and issue volume. GitHub stars may inform community size, not maturity certification.
- **Licensing:** SPDX identifier, dependencies, binary model-weight licenses, trademark limits, copyleft propagation, commercial and hosted service implications; legal approval where needed.
- **Performance:** representative 17-language datasets, latency P50/P95, memory/CPU/GPU, error rates and costs.
- **Security:** CVE/SBOM, dependency pinning, supply-chain review, OAuth boundaries, prompt injection controls, PHI/PII handling and isolated workers.
- **Integration:** Web, native Flutter, Neon persistence, authenticated backend, object storage and Hard Paywall; no direct browser secrets.
- **PoC:** actual upload/grade/review E2E with logged version, test result, fallback behavior and rollback plan.
- **Decision:** approved / rejected / deferred, dated reviewer, PR and evidence link. No silent installation.

## Non-negotiable constraints

1. **Neon stays the only primary database**. File bytes may live in encrypted object storage and the device may cache studies offline.
2. **Hard Paywall survives every OSS integration.** Never let standalone worker routes skip entitlement checks.
3. **Open source cannot reproduce a proprietary content marketplace** without contributors and rights.
4. **17 offer languages = 19 regional locale targets.** A repository claiming multilingual support is not proof of educational quality across each locale.
5. **Avoid oversized architecture.** Prefer a maintained existing dependency over deploying an additional always-on service when it only adds marginal improvement.

## Definition of complete discovery

All 48 offer rows are marked: (a) covered by existing code; (b) accepted OSS with completed PoC; (c) bespoke implementation approved; or (d) external legal/credential blocker owned by an explicit release ticket. Every decision includes test evidence.

**Current status: inventory seeded; integration decisions and PoC results pending.**
