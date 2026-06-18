import { LlmPort } from "@/src/core/ports/llm.port";
import OpenAI from "openai";

/**
 * OpenAI LLM adapter with real per-token streaming.
 * Yields each token as it arrives from the OpenAI API.
 */
export class OpenAiAnswerAdapter implements LlmPort {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gpt-4o-mini",
  ) {}

  private readonly openAi = new OpenAI({
    apiKey: this.apiKey,
  });

  async *generateResponse(
    prompt: string,
    systemInstruction?: string,
  ): AsyncGenerator<string, void, unknown> {
    try {
      const stream = await this.openAi.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemInstruction || "You are a precise assistant." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error("[OpenAI LLM Error]:", error);
      throw error;
    }
  }
}
