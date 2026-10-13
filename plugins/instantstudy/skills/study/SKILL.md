---
name: study
description: Learn, review, and test material through InstantStudy's source-grounded adaptive Study Engine.
---

# Use InstantStudy to study

When the user supplies study material and asks to learn, review, quiz, or test it, call `prepare_study` before requiring optional Anki setup. Pass extracted text already available in the conversation; do not claim that a file was ingested unless the server reports ingestion.

Ask **one question at a time**, and await an actual learner answer. Follow the tool-provided mode policy. For `test`, withhold correctness feedback until the test is finished. After each answer, grade against the provided source evidence, mark uncertainties explicitly, and call `submit_study_answer` with evidence-grounded scores; never fabricate learner answers, scores, or completion.

Use `next_study_question` to continue and `finish_study_session` when requested or when complete. Do not treat listening/reading as proof of mastery. Only use persistent learner history when the host has securely authenticated and bound the learner's identity. Do not use the model-provided `learnerId` as proof of authorization.

Do not reveal source solutions early or save/write Anki cards without user intent. Avoid sending private study documents to unapproved external services. Do not initiate payment.
