"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revalidateCategories } from "@/src/app/actions";
import type { Category } from "@/src/app/types";

interface ScrapePanelProps {
  initialCategories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function ScrapePanel({
  initialCategories,
  activeCategory,
  onCategoryChange,
}: ScrapePanelProps) {
  const router = useRouter();

  const [urlsInput, setUrlsInput] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState("");

  // Determine the active category name (from input if creating new, otherwise dropdown)
  const getActiveCategory = () => {
    if (isCreatingNew) return newCategoryName.trim();
    return activeCategory;
  };

  // Submit URLs to the scraping queue (producer API call)
  const handleScrapeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScraping(true);
    setScrapeMessage("");

    const currentCategory = getActiveCategory();

    if (!currentCategory) {
      setScrapeMessage("❌ Please select a category or enter a new category name.");
      setIsScraping(false);
      return;
    }

    // Parse newline or comma-separated URLs into a clean array
    const urlArray = urlsInput
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => url.startsWith("http"));

    if (urlArray.length === 0) {
      setScrapeMessage("❌ Please enter at least one valid HTTP/HTTPS URL.");
      setIsScraping(false);
      return;
    }

    try {
      let successCount = 0;

      // Enqueue all URLs via the API route.
      // API returns 200 immediately since it just pushes to BullMQ.
      for (const targetUrl of urlArray) {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUrl, category: currentCategory }),
        });
        if (res.ok) successCount++;
      }

      setScrapeMessage(
        `🚀 ${successCount} URL(s) successfully queued for background processing!`,
      );
      setUrlsInput("");

      // If a new category was created, revalidate the page and switch to dropdown mode
      if (isCreatingNew) {
        setIsCreatingNew(false);
        setNewCategoryName("");
        await revalidateCategories();
        router.refresh();
        onCategoryChange(currentCategory);
      }
    } catch {
      setScrapeMessage("❌ An error occurred while adding to the queue.");
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <section className="bg-slate-800/50 p-5 rounded-xl border border-slate-800 flex flex-col h-fit">
      <h2 className="text-lg font-semibold mb-3 text-indigo-300">🔗 Multi-Link Indexing</h2>
      <form onSubmit={handleScrapeSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-slate-400">CATEGORY</label>
            <button
              type="button"
              onClick={() => {
                setIsCreatingNew(!isCreatingNew);
                setNewCategoryName("");
              }}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
              {isCreatingNew ? "← Select Existing" : "+ Create New"}
            </button>
          </div>

          {isCreatingNew ? (
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter new category name..."
              className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              autoFocus
            />
          ) : (
            <select
              value={activeCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50">
              {initialCategories.length === 0 ? (
                <option value="" disabled>
                  No categories yet — create one →
                </option>
              ) : (
                initialCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            WEBSITE URLs (COMMA OR NEWLINE SEPARATED)
          </label>
          <textarea
            value={urlsInput}
            onChange={(e) => setUrlsInput(e.target.value)}
            placeholder="https://example.com/blog-1&#10;https://example.com/blog-2"
            rows={5}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500 placeholder-slate-600"
          />
        </div>

        <button
          type="submit"
          disabled={isScraping}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium text-sm p-3 rounded-lg transition-colors shadow-lg shadow-indigo-900/20">
          {isScraping ? "🔄 Queuing..." : "⚡ Queue for Processing (Async)"}
        </button>
      </form>

      {scrapeMessage && (
        <div
          className={`mt-4 text-xs p-3 rounded-lg border ${scrapeMessage.startsWith("❌") ? "bg-red-950/40 border-red-900 text-red-300" : "bg-emerald-950/40 border-emerald-900 text-emerald-300"}`}>
          {scrapeMessage}
        </div>
      )}
    </section>
  );
}
