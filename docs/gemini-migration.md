# Gemini Migration Summary

CourseForge AI now uses Google's native `@google/genai` SDK through a centralized provider layer. OpenAI SDK usage, OpenAI environment variables, and the deprecated `@google/generative-ai` package have been removed.

## Final Architecture

```text
Agents and services
  -> server/src/services/aiClient.ts
  -> server/src/lib/ai/provider.ts
  -> @google/genai GoogleGenAI client
  -> Gemini models, streaming, JSON mode, embeddings
```

The public backend routes are unchanged. Existing course generation, quiz generation, summaries, RAG chat, YouTube ranking, diagnostics, and deterministic fallbacks still flow through the same orchestrator and agent modules.

## Changed Files

- `server/src/lib/ai/provider.ts`: new Gemini provider abstraction with one reusable `GoogleGenAI` client, model selection, JSON helpers, streaming helper, embeddings, timeout handling, retry handling, quota fallback, and diagnostics.
- `server/src/services/aiClient.ts`: preserves the existing `aiClient` facade while pointing it at the Gemini provider.
- `server/src/config/env.ts`: replaces OpenAI config with Gemini config and keeps safe masked diagnostics.
- `server/src/services/startupValidator.ts`: validates Gemini instead of OpenAI.
- `server/src/agents/plannerAgent.ts`: adds Gemini-oriented instructions, JSON schema, and Zod validation for course plans.
- `server/src/agents/summaryAgent.ts`: adds transcript-grounded Gemini prompt guidance, JSON schema, and Zod validation.
- `server/src/quizzes/quizGeneratorAgent.ts`: adds transcript-grounded Gemini prompt guidance, JSON schema, and Zod validation.
- `server/src/agents/embeddingRagAgent.ts`: clarifies transcript-only answer behavior for Gemini.
- `server/src/vectorDB/vectorStore.ts`: updates Pinecone dimension guidance to Gemini embeddings.
- `server/src/tests/aiProvider.test.ts`: adds provider regression tests for JSON repair, deterministic embeddings, fallback text, fallback streaming, and offline embeddings.
- `server/package.json` and `package-lock.json`: remove `openai`, remove deprecated `@google/generative-ai`, install `@google/genai`, and add `test:ai`.
- `server/.env.example`, `server/.env`, and `README.md`: replace OpenAI environment variables with Gemini variables and deployment guidance.
- `server/src/openai/openaiService.ts` and stale `server/dist/openai`: removed.

No Docker, deployment, or CI config files were present in this workspace.

## Before vs After

Before:

```ts
const response = await openai.responses.create({
  model: env.OPENAI_MODEL,
  instructions,
  input: prompt,
  max_output_tokens: 900
});
```

After:

```ts
const response = await ai.models.generateContent({
  model: env.GEMINI_MODEL,
  contents: prompt,
  config: {
    systemInstruction: instructions,
    maxOutputTokens: 900
  }
});
```

Structured output now uses Gemini JSON mode:

```ts
config: {
  responseMimeType: "application/json",
  responseJsonSchema: plannerJsonSchema
}
```

Embeddings now use Gemini:

```ts
await ai.models.embedContent({
  model: env.GEMINI_EMBEDDING_MODEL,
  contents: texts,
  config: {
    taskType: "SEMANTIC_SIMILARITY",
    outputDimensionality: env.GEMINI_EMBEDDING_DIMENSIONS
  }
});
```

## Environment Variables

```bash
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEMINI_ADVANCED_MODEL=gemini-2.5-pro
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIMENSIONS=768
GEMINI_API_VERSION=v1beta
GEMINI_TIMEOUT_MS=30000
```

`gemini-2.5-flash` is the default fast model. `gemini-2.5-pro` is available through the provider's `"advanced"` model preference for future high-reasoning paths.

## Reliability Notes

- JSON generation uses Gemini JSON response mode plus local JSON repair for fences, extra surrounding text, and trailing commas.
- Planner, summary, and quiz outputs are validated with Zod before downstream code sees them.
- Rate limits, quota, billing, transient 5xx failures, timeouts, empty responses, malformed JSON, and invalid embeddings fall back to deterministic behavior.
- Gemini quota/billing errors activate a short fallback cooldown to protect the user workflow.
- Streaming is available at the provider layer through `streamText`; no route contract was changed because the current frontend/backend API does not expose SSE or websocket streaming.

## Cost Optimization

- Default generation uses `gemini-2.5-flash`.
- Flash thinking is disabled with `thinkingBudget: 0` for lower latency and cost.
- Pro uses a minimal thinking budget when selected.
- Embeddings default to 768 dimensions to reduce Pinecone and local vector storage cost.
- Transcript prompts are sliced at the existing boundaries to avoid expanding context size.

## Deployment Checklist

- Set `GEMINI_API_KEY` in the server runtime environment.
- Remove `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_EMBEDDING_MODEL`, and `OPENAI_EMBEDDING_DIMENSIONS`.
- Create or reconfigure Pinecone indexes to match `GEMINI_EMBEDDING_DIMENSIONS`.
- Rebuild the server after deployment dependency install.
- Run `npm run test:ai --workspace server`.
- Run `npm run test:infra --workspace server` when real Gemini, YouTube, database, and Pinecone credentials are configured.

## Verification

Completed locally:

```bash
npm run test:ai --workspace server
npm run lint --workspace server
npm run build
npm run test:infra --workspace server
```

`test:infra` passed with Gemini skipped because `GEMINI_API_KEY` is empty in the local `server/.env`; YouTube, PostgreSQL, and Pinecone validation paths completed with the configured local credentials.

## Future Improvements

- Add an SSE route that wraps `aiClient.streamText` if the frontend needs live partial-token rendering.
- Route harder planning or remediation tasks to `model: "advanced"` selectively.
- Add provider-level metrics for token usage and latency by agent.
- Add prompt/result fixtures for regression testing course, quiz, and summary quality across model upgrades.
