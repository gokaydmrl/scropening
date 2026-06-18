import { EmbeddingPort } from "@/src/core/ports/embedding.port";
import { OpenAiEmbeddingAdapter } from "./openai-embedding.adapter";
import { OllamaEmbeddingAdapter } from "./ollama-embedding.adapter";

/**
 * Factory function that selects the appropriate embedding adapter based on environment config.
 * Falls back to local Ollama (nomic-embed-text) if no OpenAI key is provided.
 */
export function createEmbeddingProvider(): EmbeddingPort {
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";

  if (openAiApiKey) {
    return new OpenAiEmbeddingAdapter(openAiApiKey);
  }

  return new OllamaEmbeddingAdapter(ollamaHost);
}
