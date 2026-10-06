# LLM compatibility

InstantStudy is not an OpenAI-specific product.

## Contract

The core product exposes provider-neutral study primitives:

- status
- list decks
- get due cards
- search cards
- create card
- record review
- resolve subscription offer

These primitives are available through two transports.

### 1. MCP

Primary integration for hosts that support Model Context Protocol.

Examples include ChatGPT and other MCP-compatible assistants.

Endpoint:

```
POST /mcp
```

### 2. REST + OpenAPI

Fallback integration for LLM platforms that expose custom tools/function calling but do not support MCP directly.

Base path:

```
/api/v1
```

OpenAPI contract:

```
/openapi.yaml
```

## Design rule

No study-domain code may import:

- OpenAI SDK
- Anthropic SDK
- Google GenAI SDK
- model-specific prompt libraries

Provider adapters call the same InstantStudy study API.

## Semantic grading

The current V1 leaves semantic grading to the host LLM. That means ChatGPT, Claude, Gemini or another model can evaluate the learner's free-text answer and then call `record_review`.

A future server-side grading service must use an interface such as:

```ts
interface GradingProvider {
  grade(input: GradeInput): Promise<GradeResult>;
}
```

and model-specific implementations must live behind that interface.

## Practical compatibility

"All LLMs" means:

1. MCP-compatible clients can connect directly.
2. Function-calling clients can use the OpenAPI/REST contract.
3. Plain chat models without tool/network access cannot operate the user's Anki collection.

This boundary is intentional and should be communicated accurately.
