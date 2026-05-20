import assert from "node:assert/strict";
import { GeminiProvider, createDeterministicEmbedding, parseJsonWithRepair } from "../lib/ai/provider.js";

const fenced = parseJsonWithRepair<{ ok: boolean }>("```json\n{\"ok\":true}\n```");
assert.equal(fenced.ok, true);

const extracted = parseJsonWithRepair<{ items: string[] }>("Here is the JSON:\n{\"items\":[\"a\",\"b\",],}\nThanks.");
assert.deepEqual(extracted.items, ["a", "b"]);

const embedding = createDeterministicEmbedding("C++ pointers and memory addresses", 32);
assert.equal(embedding.length, 32);
assert.ok(embedding.every((value) => Number.isFinite(value)));

const offlineProvider = new GeminiProvider(null);
assert.equal(
  await offlineProvider.generateText({
    prompt: "hello",
    fallback: "fallback response"
  }),
  "fallback response"
);

const streamChunks: string[] = [];
for await (const chunk of offlineProvider.streamText({
  prompt: "hello",
  fallback: "stream fallback"
})) {
  streamChunks.push(chunk);
}
assert.deepEqual(streamChunks, ["stream fallback"]);

const offlineEmbeddings = await offlineProvider.embedTexts(["alpha", "beta"]);
assert.equal(offlineEmbeddings.length, 2);
assert.equal(offlineEmbeddings[0].length, offlineEmbeddings[1].length);
assert.ok(offlineEmbeddings[0].length > 0);

console.log("AI provider migration tests passed");
