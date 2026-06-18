import { ScrapedData } from "@/src/core/entities/scraped-data";

export interface VectorStorePort {
  save(data: ScrapedData, embedding: number[], categoryId?: string): Promise<void>;
  searchSimilar(embedding: number[], limit?: number, categoryId?: string): Promise<ScrapedData[]>;
}
