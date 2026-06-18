import { ScrapedData } from "../entities/scraped-data";

export interface ScraperPort {
  scrapePage(url: string, category: string): Promise<ScrapedData>;
}
