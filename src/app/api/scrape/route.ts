import { redisConnection } from "@/src/core/infrastructure/storage/redis/redis";
import { BullMqAdapter } from "@/src/core/infrastructure/queue/bullmq.adapter";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { targetUrl, category } = await req.json();

    if (!targetUrl || typeof targetUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "A valid URL is required" },
        { status: 400 },
      );
    }

    try {
      const parsedUrl = new URL(targetUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return NextResponse.json(
          { success: false, error: "Only HTTP and HTTPS protocols are supported" },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "The provided string is not a valid URL" },
        { status: 400 },
      );
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { success: false, error: "A valid category is required" },
        { status: 400 },
      );
    }

    console.log(`[API Scrape] Enqueuing URL: ${targetUrl}`);
    const bullMqAdapter = new BullMqAdapter(redisConnection);
    await bullMqAdapter.addJob("scraping_jobs", { targetUrl, category });

    return NextResponse.json({
      success: true,
      message: "Job added to queue",
    });
  } catch (error) {
    console.error("[API Scrape] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
