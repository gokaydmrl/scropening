import { LlmPort } from "../../../ports/llm.port";

/**
 * Ollama LLM adapter that communicates with a local Ollama instance.
 * Implements real streaming — yields tokens as they arrive from the model.
 */
export class OllamaAnswerAdapter implements LlmPort {
  constructor(
    private host: string,
    private model: string = "gemma3",
  ) {}

  async *generateResponse(
    prompt: string,
    systemInstruction?: string,
  ): AsyncGenerator<string> {
    try {
      const response = await fetch(`${this.host}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          system:
            systemInstruction ||
            "You are a precise AI assistant that answers questions based on provided text. Only use the given context, do not fabricate information.",
          stream: true,
          options: {
            temperature: 0,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP Error! Status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Ollama response has no readable stream body.");
      }

      // Ollama streams newline-delimited JSON objects when stream: true
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              yield parsed.response;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (error) {
      console.error("[Ollama LLM Error]:", error);
      throw error;
    }
  }
}
