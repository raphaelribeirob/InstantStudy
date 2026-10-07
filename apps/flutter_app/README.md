# InstantStudy Flutter

This is the canonical first-party application client.

The app never embeds `INSTANTSTUDY_API_KEY`, MCP credentials, Paddle secrets, or
admin credentials. It calls the public InstantStudy web BFF, which holds backend
credentials server-side.

Run with a different BFF:

```bash
flutter run --dart-define=INSTANTSTUDY_BFF_URL=https://your-web-host.example
```

Initial vertical slice:

- paste learning material;
- choose Learn / Quiz / Test / Review;
- prepare a study session;
- submit answers;
- receive deterministic-first / LLM-escalated grading;
- progress to the next adaptive concept.

The React/Vite app remains the marketing/PWA surface while Flutter reaches full
feature parity.
