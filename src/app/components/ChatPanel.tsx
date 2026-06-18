"use client";

import { useState, useRef, useEffect } from "react";
import type { Message } from "@/src/app/types";

interface ChatPanelProps {
  activeCategory: string;
}

export default function ChatPanel({ activeCategory }: ChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatting, setIsChatting] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time SSE chat handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isChatting) return;

    const userMsgId = Math.random().toString();
    const aiMsgId = Math.random().toString();

    const currentUserQuestion = question;
    setMessages((prev) => [...prev, { id: userMsgId, sender: "user", text: currentUserQuestion }]);
    setQuestion("");
    setIsChatting(true);

    // Create an empty AI message bubble that will be filled as tokens stream in
    setMessages((prev) => [...prev, { id: aiMsgId, sender: "ai", text: "..." }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentUserQuestion, category: activeCategory }),
      });

      if (!response.body) throw new Error("No readable stream in response.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let currentAiText = "";

      // Read from the SSE stream until done
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE "data: {...}\n\n" blocks
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const rawData = line.replace("data: ", "").trim();
              const parsed = JSON.parse(rawData);

              if (parsed.token) {
                currentAiText += parsed.token;
                // Update the AI message bubble with each incoming token
                setMessages((prev) =>
                  prev.map((m) => (m.id === aiMsgId ? { ...m, text: currentAiText } : m)),
                );
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, text: "❌ An error occurred while fetching the response." } : m,
        ),
      );
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <section className="lg:col-span-2 bg-slate-800/30 rounded-xl border border-slate-800 flex flex-col h-[70vh] lg:h-auto overflow-hidden">
      {/* Message Window */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <span className="text-4xl">💬</span>
            <p className="text-sm">No conversation started yet.</p>
            <p className="text-xs max-w-xs text-center">
              Ask a question about your scraped content — the AI will automatically retrieve
              relevant context via RAG search.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] p-3.5 rounded-xl text-sm leading-relaxed ${msg.sender === "user" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"}`}>
                <span className="block text-[10px] uppercase font-bold tracking-wider mb-1 opacity-50">
                  {msg.sender === "user" ? "You" : "Scropen Agent"}
                </span>
                {msg.text === "..." ? (
                  <div className="flex items-center space-x-2 py-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                    <span className="text-xs text-slate-400 font-medium pl-1">Analyzing & retrieving...</span>
                  </div>
                ) : (
                  <p className="whitespace-pre-line">{msg.text}</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <form
        onSubmit={handleChatSubmit}
        className="p-4 border-t border-slate-800 bg-slate-900/60 flex gap-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your scraped content..."
          disabled={isChatting}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isChatting || !question.trim()}
          className="bg-slate-100 text-slate-950 font-medium px-5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40 text-sm flex items-center justify-center gap-2 min-w-[80px]">
          {isChatting ? (
            <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            "Ask"
          )}
        </button>
      </form>
    </section>
  );
}
