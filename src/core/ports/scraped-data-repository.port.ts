import { ScrapedData } from "@/src/core/entities/scraped-data";

export interface ScrapedDataRepositoryPort {
  save(data: ScrapedData): Promise<void>;
  findById(id: string): Promise<ScrapedData | null>;
  searchByContent(query: string): Promise<ScrapedData[]>;
}
