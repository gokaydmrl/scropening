import { EmbeddingPort } from "../../../ports/embedding.port";
import OpenAI from "openai";

/**
 * OpenAI embedding adapter using the text-embedding-3-small model (1536 dimensions).
 */
export class OpenAiEmbeddingAdapter implements EmbeddingPort {
  private openai: OpenAI;
  private readonly modelName: string;

  constructor(apiKey: string, modelName: string = "text-embedding-3-small") {
    this.openai = new OpenAI({
      apiKey,
      baseURL: "https://api.openai.com/v1",
    });
    this.modelName = modelName;
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.modelName,
        input: text,
      });

      if (!response || response.data.length === 0) {
        throw new Error("OpenAI API returned no embeddings for the given text.");
      }

      return response.data[0].embedding;
    } catch (error) {
      console.error("[OpenAI Embedding Error]:", error);
      throw new Error("Failed to generate embeddings");
    }
  }
}
