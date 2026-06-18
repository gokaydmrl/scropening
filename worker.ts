import { ScrapeAndIndexUseCase } from "./src/core/use-cases/scrape-and-index.usecase";
import { EmbeddingPort } from "./src/core/ports/embedding.port";
import { DrizzlePgVectorAdapter } from "./src/core/infrastructure/storage/drizzle/drizzle-pgvector.adapter";
import { OpenAiEmbeddingAdapter } from "./src/core/infrastructure/llm/embedding/openai-embedding.adapter";
import { OllamaEmbeddingAdapter } from "./src/core/infrastructure/llm/embedding/ollama-embedding.adapter";
import { BullMqAdapter } from "./src/core/infrastructure/queue/bullmq.adapter";
import { StaticScraperAdapter } from "./src/core/infrastructure/scrapers/static.scraper";
import { redisConnection } from "./src/core/infrastructure/storage/redis/redis";
import { db } from "./src/core/infrastructure/storage/drizzle/db";
import { DrizzleCategoryAdapter } from "./src/core/infrastructure/storage/drizzle/drizzle-category.adapter";

/**
 * Worker entry point — runs as a standalone process outside of Next.js.
 * Consumes scraping jobs from the BullMQ queue and executes the
 * ScrapeAndIndexUseCase for each job.
 *
 * Composition Root: all port implementations are wired here.
 */
async function bootstrapWorker() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";

  console.log("[Worker] Connecting to PostgreSQL...");
  const drizzleRepoAdapter = new DrizzlePgVectorAdapter(db);

  // Select embedding adapter based on available API keys
  let selectedEmbeddingAdapter: EmbeddingPort;

  if (openaiApiKey && openaiApiKey.startsWith("sk-") && openaiApiKey.length > 15) {
    console.log("[Worker] Using OpenAI embeddings (text-embedding-3-small, 1536 dim)");
    selectedEmbeddingAdapter = new OpenAiEmbeddingAdapter(openaiApiKey);
  } else {
    console.log("[Worker] Using local Ollama embeddings (nomic-embed-text, 768 dim)");
    selectedEmbeddingAdapter = new OllamaEmbeddingAdapter(ollamaHost, "nomic-embed-text");
  }

  const scraper = new StaticScraperAdapter();
  const categoryAdapter = new DrizzleCategoryAdapter(db);

  const scrapeAndIndexUseCase = new ScrapeAndIndexUseCase(
    drizzleRepoAdapter,
    selectedEmbeddingAdapter,
    scraper,
    categoryAdapter,
  );

  console.log("[Worker] Connecting to Redis via BullMQ...");
  const bullMqAdapter = new BullMqAdapter(redisConnection);

  await bullMqAdapter.consume("scraping_jobs", async (payload) => {
    try {
      if (
        !payload ||
        typeof payload.targetUrl !== "string" ||
        typeof payload.category !== "string"
      ) {
        console.error("[Worker] Invalid job payload, skipping:", payload);
        return;
      }
      await scrapeAndIndexUseCase.execute(payload.targetUrl, payload.category);
    } catch (jobError) {
      console.error(`[Worker] Failed to process ${payload.targetUrl}:`, jobError);
      throw jobError;
    }
  });
}

bootstrapWorker().catch((err) => {
  console.error("[Worker] Fatal error during bootstrap:", err);
  process.exit(1);
});
