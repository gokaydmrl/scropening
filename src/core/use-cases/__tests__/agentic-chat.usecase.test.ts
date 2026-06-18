import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgenticChatUseCase } from "../agentic-chat.usecase";
import { LlmPort } from "../../ports/llm.port";
import { VectorStorePort } from "../../ports/vector-store.port";
import { EmbeddingPort } from "../../ports/embedding.port";
import { ScrapedData } from "../../entities/scraped-data";

// ─── Mock Factories ──────────────────────────────────────────────

function createMockChunk(content: string): ScrapedData {
  return new ScrapedData({
    id: "chunk-id",
    url: "https://example.com",
    content,
    title: "Test",
    category: "test",
    categoryId: "cat-1",
    metadata: {},
  });
}

function createMockPorts() {
  const llm: LlmPort = {
    generateResponse: vi.fn(async function* (prompt: string) {
      if (prompt.includes("RETRIEVE")) {
        yield "RETRIEVE";
      } else if (prompt.includes("PASS or FAIL")) {
        yield "PASS";
      } else if (prompt.includes("no relevant indexed context")) {
        yield "No relevant documents found in the index for this query.";
      } else {
        yield "This is ";
        yield "the answer.";
      }
    }),
  };

  const vectorStore: VectorStorePort = {
    save: vi.fn(),
    searchSimilar: vi.fn().mockResolvedValue([
      createMockChunk("Relevant context paragraph one."),
      createMockChunk("Relevant context paragraph two."),
    ]),
  };

  const embedding: EmbeddingPort = {
    createEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  };

  return { llm, vectorStore, embedding };
}

// ─── Tests ───────────────────────────────────────────────────────

describe("AgenticChatUseCase", () => {
  let useCase: AgenticChatUseCase;
  let ports: ReturnType<typeof createMockPorts>;

  beforeEach(() => {
    ports = createMockPorts();
    useCase = new AgenticChatUseCase(ports.llm, ports.vectorStore, ports.embedding);
  });

  it("should return an AsyncGenerator", () => {
    const result = useCase.execute("What is X?", "test-category");
    expect(result[Symbol.asyncIterator]).toBeDefined();
  });

  it("should yield the final answer from the RAG pipeline", async () => {
    const chunks: string[] = [];
    for await (const chunk of useCase.execute("What is X?", "test-category")) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    // The answer should contain something (depends on the full pipeline)
    const fullAnswer = chunks.join("");
    expect(fullAnswer.length).toBeGreaterThan(0);
  });

  it("should embed the question for similarity search", async () => {
    // Consume the generator to trigger execution
    await useCase.execute("What is X?", "test").next();

    expect(ports.embedding.createEmbedding).toHaveBeenCalledWith("What is X?");
  });

  it("should search the vector store with the embedded question", async () => {
    await useCase.execute("What is X?", "my-category").next();

    expect(ports.vectorStore.searchSimilar).toHaveBeenCalledWith(
      [0.1, 0.2, 0.3], // mocked embedding
      4,                // default limit
      "my-category",
    );
  });

  it("should return a no-results message when vector store is empty", async () => {
    vi.mocked(ports.vectorStore.searchSimilar).mockResolvedValue([]);

    const chunks: string[] = [];
    for await (const chunk of useCase.execute("Unknown topic?", "empty")) {
      chunks.push(chunk);
    }

    const fullAnswer = chunks.join("");
    expect(fullAnswer).toContain("No relevant documents");
  });

  it("should pass retrieved context to the LLM", async () => {
    await useCase.execute("What is X?", "test").next();

    // The LLM should have been called with a prompt containing the retrieved context
    expect(ports.llm.generateResponse).toHaveBeenCalled();
    const generationCall = vi.mocked(ports.llm.generateResponse).mock.calls.find(
      (call) => call[0].includes("Context data:")
    );
    expect(generationCall).toBeDefined();
    const systemPrompt = generationCall![0];
    expect(systemPrompt).toContain("Relevant context paragraph one.");
    expect(systemPrompt).toContain("Relevant context paragraph two.");
  });
});
