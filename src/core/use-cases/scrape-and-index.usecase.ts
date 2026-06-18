import { VectorStorePort } from "../ports/vector-store.port";
import { EmbeddingPort } from "../ports/embedding.port";
import { ScrapedData } from "../entities/scraped-data";
import { ScraperPort } from "../ports/scraper.port";
import { CategoryPort } from "../ports/category.port";

/**
 * Orchestrates the full scrape-and-index pipeline:
 *  1. Scrape the target URL using the scraper adapter
 *  2. Split extracted text into sentence-aware chunks
 *  3. Create or resolve the category
 *  4. Embed each chunk and persist to the vector store
 */
export class ScrapeAndIndexUseCase {
  constructor(
    private readonly vectorStoreRepo: VectorStorePort,
    private readonly embeddingService: EmbeddingPort,
    private readonly scraper: ScraperPort,
    private readonly categoryRepo: CategoryPort,
  ) {}

  public async execute(url: string, categoryName: string) {
    try {
      console.log(`   [1/4] Scraping website...`);
      const mainEntity = await this.scraper.scrapePage(url, categoryName);

      console.log(`   [2/4] Splitting text into chunks...`);
      const chunks = this.splitIntoChunks(mainEntity.content, 500);
      console.log(`   -> Produced ${chunks.length} text chunks.`);

      let categoryId = await this.categoryRepo.getCategoryByName(categoryName);
      if (!categoryId) {
        categoryId = await this.categoryRepo.createCategory(categoryName);
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        console.log(`   [3/4] [Chunk ${i + 1}/${chunks.length}] Generating embedding...`);

        const chunkEntity = new ScrapedData({
          url: mainEntity.url,
          content: chunkText,
          id: crypto.randomUUID(),
          category: categoryName,
          categoryId: categoryId || "",
          title: mainEntity.title,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const embedding = await this.embeddingService.createEmbedding(chunkEntity.content);

        console.log(`   [4/4] [Chunk ${i + 1}/${chunks.length}] Persisting to PostgreSQL...`);
        await this.vectorStoreRepo.save(chunkEntity, embedding, categoryId || "");
      }

      console.log(`[ScrapeAndIndex] Successfully indexed: "${mainEntity.title}"\n`);
    } catch (error) {
      console.error("[ScrapeAndIndex] Error:", error);
      throw error;
    }
  }

  /**
   * Splits text into chunks by sentence boundaries, respecting maxLength.
   * Keeps sentences intact to preserve semantic meaning for embeddings.
   */
  public splitIntoChunks(text: string, maxLength: number): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength) {
        if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
    return chunks;
  }
}
