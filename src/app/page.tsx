import { db } from "@/src/core/infrastructure/storage/drizzle/db";
import { DrizzleCategoryAdapter } from "@/src/core/infrastructure/storage/drizzle/drizzle-category.adapter";
import Header from "./components/Header";
import DashboardShell from "./components/DashboardShell";

// Force dynamic rendering — this page queries the database at request time
export const dynamic = "force-dynamic";

export default async function Home() {
  const drizzleCategoryAdapter = new DrizzleCategoryAdapter(db);
  const categories = await drizzleCategoryAdapter.getCategories();

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col p-4 md:p-8 font-sans">
      <Header />
      <DashboardShell initialCategories={categories} />
    </main>
  );
}
