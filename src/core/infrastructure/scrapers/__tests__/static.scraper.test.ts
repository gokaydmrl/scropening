import { describe, it, expect, vi, beforeEach } from "vitest";
import { StaticScraperAdapter } from "../static.scraper";

// ─── Tests ───────────────────────────────────────────────────────

describe("StaticScraperAdapter", () => {
  let scraper: StaticScraperAdapter;

  beforeEach(() => {
    scraper = new StaticScraperAdapter();
  });

  it("should extract title and content from valid HTML", async () => {
    const mockHtml = `
      <html>
        <head><title>Test Blog Post</title></head>
        <body>
          <nav>Navigation links here</nav>
          <main>
            <h1>Test Blog Post Heading</h1>
            <p>This is the first paragraph with enough content to pass the 20 character threshold for extraction.</p>
            <p>This is the second paragraph which also has enough text to be extracted by the scraper adapter.</p>
          </main>
          <footer>Footer content here</footer>
          <script>console.log("should be removed")</script>
        </body>
      </html>
    `;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(mockHtml, { status: 200 }),
    );

    const result = await scraper.scrapePage("https://example.com/blog", "tech");

    expect(result.title).toBe("Test Blog Post");
    expect(result.url).toBe("https://example.com/blog");
    expect(result.category).toBe("tech");
    expect(result.content).toContain("first paragraph");
    expect(result.content).toContain("second paragraph");
    // Verify noise elements are removed
    expect(result.content).not.toContain("Navigation links");
    expect(result.content).not.toContain("console.log");
  });

  it("should throw when the HTTP request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Not Found", { status: 404 }),
    );

    await expect(
      scraper.scrapePage("https://example.com/404", "test"),
    ).rejects.toThrow("Failed to fetch HTML");
  });

  it("should throw when no meaningful content is extracted", async () => {
    const emptyHtml = `
      <html>
        <head><title>Empty</title></head>
        <body>
          <script>var x = 1;</script>
          <style>.hidden{}</style>
        </body>
      </html>
    `;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(emptyHtml, { status: 200 }),
    );

    await expect(
      scraper.scrapePage("https://example.com/empty", "test"),
    ).rejects.toThrow("Could not extract any meaningful text");
  });

  it("should filter out short text fragments (< 20 chars)", async () => {
    const htmlWithShortText = `
      <html>
        <head><title>Mixed Content</title></head>
        <body>
          <div>
            <p>OK</p>
            <p>Short</p>
          </div>
          <article>
            <p>This is a paragraph that is long enough to be included in the extraction results by the adapter.</p>
          </article>
        </body>
      </html>
    `;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(htmlWithShortText, { status: 200 }),
    );

    const result = await scraper.scrapePage("https://example.com", "test");

    // The long paragraph should be extracted
    expect(result.content).toContain("long enough to be included");
    // Content should not be empty
    expect(result.content.length).toBeGreaterThan(20);
  });

  it("should generate a valid UUID for the scraped data id", async () => {
    const mockHtml = `
      <html><head><title>T</title></head><body>
        <p>This is enough content to pass the minimum length threshold for extraction purposes.</p>
      </body></html>
    `;

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(mockHtml, { status: 200 }),
    );

    const result = await scraper.scrapePage("https://example.com", "test");

    // UUID v4 format
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
