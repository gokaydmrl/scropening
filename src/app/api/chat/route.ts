import { NextResponse } from "next/server";
import { db } from "@/src/core/infrastructure/storage/drizzle/db";
import { DrizzlePgVectorAdapter } from "@/src/core/infrastructure/storage/drizzle/drizzle-pgvector.adapter";
import { createLlmAnswerProvider } from "@/src/core/infrastructure/llm/answer/llm-answer.provider";
import { createEmbeddingProvider } from "@/src/core/infrastructure/llm/embedding/embedding.provider";
import { AgenticChatUseCase } from "@/src/core/use-cases/agentic-chat.usecase";

export async function POST(request: Request) {
  try {
    const { question, category } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { success: false, error: "Question is required and must be a string" },
        { status: 400 },
      );
    }

    const vectorStoreRepo = new DrizzlePgVectorAdapter(db);
    const llmService = createLlmAnswerProvider();
    const embeddingService = createEmbeddingProvider();

    const agenticChatUseCase = new AgenticChatUseCase(
      llmService,
      vectorStoreRepo,
      embeddingService,
    );

    // Real SSE streaming — consume the AsyncGenerator and pipe tokens to the client
    const answer = agenticChatUseCase.execute(question, category || "");
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of answer) {
            const data = `data: ${JSON.stringify({ token: chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (e) {
          console.error("[API Chat] Streaming error:", e);
          const errorData = `data: ${JSON.stringify({ error: "Stream processing failed" })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[API Chat] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
