"use client";

import { useState } from "react";
import ScrapePanel from "./ScrapePanel";
import ChatPanel from "./ChatPanel";
import type { Category } from "@/src/app/types";

interface DashboardShellProps {
  initialCategories: Category[];
}

/**
 * Client wrapper that owns the shared activeCategory state.
 * Both ScrapePanel and ChatPanel need to coordinate on which category is selected.
 */
export default function DashboardShell({ initialCategories }: DashboardShellProps) {
  const [activeCategory, setActiveCategory] = useState(
    initialCategories.length > 0 ? initialCategories[0].name : "",
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
      <ScrapePanel
        initialCategories={initialCategories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <ChatPanel activeCategory={activeCategory} />
    </div>
  );
}
