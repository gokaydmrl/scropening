export interface LlmPort {
  generateResponse(
    prompt: string,
    systemInstruction?: string,
    history?: string[],
  ): AsyncGenerator<string, void, unknown>;
}
