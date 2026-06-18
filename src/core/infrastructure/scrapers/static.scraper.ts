import { ScrapedData } from "../../entities/scraped-data";
import { ScraperPort } from "../../ports/scraper.port";
import * as cheerio from "cheerio";

/**
 * Static HTML scraper using Cheerio.
 * Fetches a page's HTML via HTTP and extracts meaningful text content
 * by removing noise elements (scripts, styles, nav, etc.).
 */
export class StaticScraperAdapter implements ScraperPort {
  constructor() {}

  async scrapePage(url: string, category: string): Promise<ScrapedData> {
    console.log(`[Scraper] Fetching static HTML from: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch HTML! Status: ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove noise elements that don't contribute to the page's content
      $("script, style, nav, footer, iframe, noscript, header").remove();

      const title = $("title").text().trim() || "Untitled Page";

      // Extract meaningful text from content-bearing elements
      const contentParts: string[] = [];
      $("article, main, p, h1, h2, h3, li").each((_, element) => {
        const text = $(element).text().trim();
        if (text.length > 20 && !contentParts.includes(text)) {
          contentParts.push(text);
        }
      });

      const cleanContent = contentParts.join("\n\n");

      if (!cleanContent) {
        throw new Error("Could not extract any meaningful text content from this page.");
      }

      console.log(
        `[Scraper] Extraction complete. Title: "${title}", Length: ${cleanContent.length} chars.`,
      );

      return new ScrapedData({
        url,
        content: cleanContent,
        metadata: { title },
        category,
        categoryId: null,
        title: title,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("[Scraper Error]:", error);
      throw error;
    }
  }
}
