import { ScrapedData } from "@/src/core/entities/scraped-data";
import { VectorStorePort } from "@/src/core/ports/vector-store.port";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { siteChunksSchema } from "./schema";
import { sql, desc, eq } from "drizzle-orm";

/**
 * Drizzle ORM adapter for pgvector-powered similarity search.
 * Handles persisting embedded chunks and cosine-similarity retrieval.
 */
export class DrizzlePgVectorAdapter implements VectorStorePort {
  constructor(private readonly db: NodePgDatabase<typeof import("./schema")>) {}

  async save(data: ScrapedData, embedding: number[], categoryId: string): Promise<void> {
    try {
      await this.db.insert(siteChunksSchema).values({
        id: data.id,
        url: data.url,
        content: data.content,
        embedding: embedding,
        category: data.category,
        categoryId: categoryId,
        title: data.title,
      });
    } catch (error) {
      console.error("[DrizzlePgVector] Save error:", error);
      throw error;
    }
  }

  async searchSimilar(embedding: number[], limit: number = 5, category?: string): Promise<ScrapedData[]> {
    try {
      const vectorString = JSON.stringify(embedding);
      const similarityExpression = sql`1 - (${siteChunksSchema.embedding} <=> ${vectorString}::vector)`;

      let query = this.db
        .select({
          id: siteChunksSchema.id,
          url: siteChunksSchema.url,
          title: siteChunksSchema.title,
          content: siteChunksSchema.content,
          createdAt: siteChunksSchema.createdAt,
          category: siteChunksSchema.category,
          categoryId: siteChunksSchema.categoryId,
          score: similarityExpression,
        })
        .from(siteChunksSchema);

      // Apply category filter if provided
      if (category) {
        query = query.where(eq(siteChunksSchema.category, category)) as typeof query;
      }

      const rows = await query
        .orderBy(desc(similarityExpression))
        .limit(limit);

      return rows.map((row) => {
        return new ScrapedData({
          id: row.id,
          url: row.url,
          content: row.content,
          createdAt: row.createdAt,
          metadata: {},
          category: row.category,
          categoryId: row.categoryId,
          title: row.title,
        });
      });
    } catch (error) {
      console.error("[DrizzlePgVector] Search error:", error);
      throw error;
    }
  }
}
