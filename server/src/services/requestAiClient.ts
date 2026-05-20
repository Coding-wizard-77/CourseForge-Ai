import type { Request } from "express";
import { createGeminiProvider } from "../lib/ai/provider.js";
import { aiClient } from "./aiClient.js";

const GEMINI_KEY_HEADER = "x-gemini-api-key";

export function getRequestAiClient(request: Request) {
  const apiKey = request.header(GEMINI_KEY_HEADER)?.trim();
  return apiKey ? createGeminiProvider(apiKey) : aiClient;
}
