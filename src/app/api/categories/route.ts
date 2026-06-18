import { db } from "@/src/core/infrastructure/storage/drizzle/db";
import { NextResponse } from "next/server";
import { DrizzleCategoryAdapter } from "@/src/core/infrastructure/storage/drizzle/drizzle-category.adapter";

export async function GET() {
  try {
    const drizzleCategoryAdapter = new DrizzleCategoryAdapter(db);
    const categories = await drizzleCategoryAdapter.getCategories();
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("[API Categories] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
