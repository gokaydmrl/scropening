import { pgTable, text, timestamp, customType } from "drizzle-orm/pg-core";

/**
 * Custom pgvector column type for flexible embedding dimensions.
 * Supports both 768-dim (Ollama nomic-embed-text) and 1536-dim (OpenAI text-embedding-3-small).
 */
const flexibleVector = customType<{ data: number[] }>({
  dataType() {
    return "vector";
  },
  toDriver(value: number[]) {
    return JSON.stringify(value);
  },
  fromDriver(value: unknown) {
    if (typeof value === "string") {
      return value
        .replace(/[\[\]]/g, "")
        .split(",")
        .map(Number);
    }
    return value as number[];
  },
});

export const siteChunksSchema = pgTable("site_chunks", {
  id: text("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  categoryId: text("category_id"),
  embedding: flexibleVector("embedding"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categoriesSchema = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});
