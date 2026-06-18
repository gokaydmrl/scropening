import { LlmPort } from "../../../ports/llm.port";
import { OpenAiAnswerAdapter } from "./openai-answer.adapter";
import { OllamaAnswerAdapter } from "./ollama-answer.adapter";

/**
 * Factory function that selects the appropriate LLM adapter based on environment config.
 * Falls back to local Ollama if no OpenAI key is provided.
 */
export function createLlmAnswerProvider(): LlmPort {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";

  if (openAiApiKey) {
    return new OpenAiAnswerAdapter(openAiApiKey, "gpt-4o-mini");
  }

  return new OllamaAnswerAdapter(ollamaHost);
}
