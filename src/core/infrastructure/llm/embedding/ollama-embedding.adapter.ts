import { EmbeddingPort } from "../../../ports/embedding.port";

/**
 * Ollama embedding adapter that generates vector embeddings using a local Ollama instance.
 * Default model: nomic-embed-text (768 dimensions).
 */
export class OllamaEmbeddingAdapter implements EmbeddingPort {
  constructor(
    private readonly ollamaHost: string,
    private readonly modelName: string = "nomic-embed-text",
  ) {}

  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.ollamaHost}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelName,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP Error! Status: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.embedding || data.embedding.length < 1) {
        throw new Error("Ollama response did not contain a valid embedding array.");
      }

      return data.embedding as number[];
    } catch (error) {
      console.error("[Ollama Embedding Error]:", error);
      throw new Error("Ollama connection failed.");
    }
  }
}
