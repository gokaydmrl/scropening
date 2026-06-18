import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScrapeAndIndexUseCase } from "../scrape-and-index.usecase";
import { VectorStorePort } from "../../ports/vector-store.port";
import { EmbeddingPort } from "../../ports/embedding.port";
import { ScraperPort } from "../../ports/scraper.port";
import { CategoryPort } from "../../ports/category.port";
import { ScrapedData } from "../../entities/scraped-data";

// ─── Mock Factories ──────────────────────────────────────────────

function createMockScrapedData(overrides?: Partial<ScrapedData>): ScrapedData {
  return new ScrapedData({
    id: "test-id",
    url: "https://example.com",
    content: "This is a test sentence. Another test sentence here. And a third one to make it chunky enough.",
    title: "Test Page",
    category: "test-category",
    categoryId: "cat-1",
    metadata: {},
    ...overrides,
  });
}

function createMockPorts() {
  const vectorStore: VectorStorePort = {
    save: vi.fn().mockResolvedValue(undefined),
    searchSimilar: vi.fn().mockResolvedValue([]),
  };

  const embedding: EmbeddingPort = {
    createEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  };

  const scraper: ScraperPort = {
    scrapePage: vi.fn().mockResolvedValue(createMockScrapedData()),
  };

  const category: CategoryPort = {
    createCategory: vi.fn().mockResolvedValue("new-cat-id"),
    getCategories: vi.fn().mockResolvedValue([]),
    getCategoryByName: vi.fn().mockResolvedValue(null),
  };

  return { vectorStore, embedding, scraper, category };
}

// ─── Tests ───────────────────────────────────────────────────────

describe("ScrapeAndIndexUseCase", () => {
  let useCase: ScrapeAndIndexUseCase;
  let ports: ReturnType<typeof createMockPorts>;

  beforeEach(() => {
    ports = createMockPorts();
    useCase = new ScrapeAndIndexUseCase(
      ports.vectorStore,
      ports.embedding,
      ports.scraper,
      ports.category,
    );
  });

  it("should scrape, chunk, embed, and persist to the vector store", async () => {
    await useCase.execute("https://example.com", "test-category");

    expect(ports.scraper.scrapePage).toHaveBeenCalledWith("https://example.com", "test-category");
    expect(ports.embedding.createEmbedding).toHaveBeenCalled();
    expect(ports.vectorStore.save).toHaveBeenCalled();
  });

  it("should create a new category when one does not already exist", async () => {
    vi.mocked(ports.category.getCategoryByName).mockResolvedValue(null);

    await useCase.execute("https://example.com", "new-category");

    expect(ports.category.getCategoryByName).toHaveBeenCalledWith("new-category");
    expect(ports.category.createCategory).toHaveBeenCalledWith("new-category");
  });

  it("should reuse an existing category when it already exists", async () => {
    vi.mocked(ports.category.getCategoryByName).mockResolvedValue("existing-cat-id");

    await useCase.execute("https://example.com", "existing-category");

    expect(ports.category.getCategoryByName).toHaveBeenCalledWith("existing-category");
    expect(ports.category.createCategory).not.toHaveBeenCalled();
  });

  it("should generate an embedding for each chunk", async () => {
    const longContent = Array(10).fill("This is a test sentence with enough length to matter.").join(" ");
    vi.mocked(ports.scraper.scrapePage).mockResolvedValue(
      createMockScrapedData({ content: longContent }),
    );

    await useCase.execute("https://example.com", "test");

    // Each chunk should get an embedding call
    const embeddingCalls = vi.mocked(ports.embedding.createEmbedding).mock.calls.length;
    const saveCalls = vi.mocked(ports.vectorStore.save).mock.calls.length;
    expect(embeddingCalls).toBe(saveCalls);
    expect(embeddingCalls).toBeGreaterThan(0);
  });

  it("should propagate errors from the scraper", async () => {
    vi.mocked(ports.scraper.scrapePage).mockRejectedValue(new Error("Network error"));

    await expect(useCase.execute("https://example.com", "test")).rejects.toThrow("Network error");
  });
});

describe("ScrapeAndIndexUseCase.splitIntoChunks", () => {
  let useCase: ScrapeAndIndexUseCase;

  beforeEach(() => {
    const ports = createMockPorts();
    useCase = new ScrapeAndIndexUseCase(
      ports.vectorStore,
      ports.embedding,
      ports.scraper,
      ports.category,
    );
  });

  it("should split text into chunks respecting sentence boundaries", () => {
    const text = "First sentence. Second sentence. Third sentence. Fourth sentence.";
    const chunks = useCase.splitIntoChunks(text, 40);

    // Each chunk should end with a complete sentence
    for (const chunk of chunks) {
      expect(chunk).toMatch(/\.$/);
    }
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("should keep short texts as a single chunk", () => {
    const text = "Short text.";
    const chunks = useCase.splitIntoChunks(text, 500);

    expect(chunks).toEqual(["Short text."]);
  });

  it("should not produce empty chunks", () => {
    const text = "A. B. C. D. E.";
    const chunks = useCase.splitIntoChunks(text, 5);

    for (const chunk of chunks) {
      expect(chunk.trim().length).toBeGreaterThan(0);
    }
  });

  it("should handle text without sentence terminators", () => {
    const text = "This is text without any sentence terminators so it should stay as one chunk";
    const chunks = useCase.splitIntoChunks(text, 500);

    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe(text);
  });
});
