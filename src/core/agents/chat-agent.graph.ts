import { Annotation, StateGraph } from "@langchain/langgraph";
import { LlmPort } from "../ports/llm.port";
import { VectorStorePort } from "../ports/vector-store.port";
import { EmbeddingPort } from "../ports/embedding.port";

/**
 * LangGraph state definition for the RAG agent pipeline.
 * Each field has a reducer that governs how concurrent updates merge.
 */
export const AgentState = Annotation.Root({
  userQuestion: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  category: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  retrievedContext: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  finalAnswer: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "",
  }),
  routingDecision: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "retrieve",
  }),
  onToken: Annotation<((token: string) => void) | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined,
  }),
});

type AgentStateType = typeof AgentState.State;

/**
 * Advanced Agentic RAG graph with 4 discrete nodes:
 *  1. `analyzer` — decides if the query needs RAG context lookup (e.g. greetings skip retrieval)
 *  2. `retriever` — embeds the question and fetches relevant chunks from pgvector
 *  3. `generator` — feeds retrieved context (if any) to the LLM and streams response tokens
 *  4. `guardrail` — checks the final response alignment with retrieved context to detect hallucinations
 */
export class AgenticChatGraph {
  constructor(
    private readonly llmService: LlmPort,
    private readonly vectorStoreRepo: VectorStorePort,
    private readonly embeddingService: EmbeddingPort,
  ) {}

  public buildGraph() {
    const workflow = new StateGraph(AgentState);

    // Node 1: Analyze user question to determine routing
    workflow.addNode("analyzer", async (state: AgentStateType) => {
      const question = state.userQuestion.trim();

      // Simple greeting bypass
      const greetings = ["hello", "hi", "hey", "how are you", "what are you", "who are you"];
      const isGreeting = greetings.some(
        (g) => question.toLowerCase().startsWith(g) || question.toLowerCase() === g,
      );

      if (isGreeting || question.length < 5) {
        return {
          routingDecision: "direct",
          retrievedContext: "No context retrieved. This is a general greeting or short query.",
        };
      }

      // LLM-assisted semantic routing check
      const classificationPrompt = `Analyze the user's question and decide if answering it requires looking up specific scraped website content/documentation (return "RETRIEVE") or if it is a general question, greeting, or meta-question about yourself (return "DIRECT").
Respond with ONLY the word "RETRIEVE" or "DIRECT".

Question: "${question}"`;

      try {
        let response = "";
        for await (const chunk of this.llmService.generateResponse(
          classificationPrompt,
          "You are a routing helper. Reply with only one word: RETRIEVE or DIRECT.",
        )) {
          response += chunk;
        }

        const decision = response.trim().toUpperCase().includes("RETRIEVE") ? "retrieve" : "direct";
        return { routingDecision: decision };
      } catch (error) {
        console.warn("[Agent] Analyzer routing failed, falling back to retrieval:", error);
        return { routingDecision: "retrieve" };
      }
    });

    // Node 2: Retrieve relevant chunks from the vector store
    workflow.addNode("retriever", async (state: AgentStateType) => {
      const category = state.category || "";
      const question = state.userQuestion;

      const queryEmbedding = await this.embeddingService.createEmbedding(question);
      const relevantChunks = await this.vectorStoreRepo.searchSimilar(
        queryEmbedding,
        4,
        category,
      );

      if (!relevantChunks || relevantChunks.length === 0) {
        return { retrievedContext: "NO_DOCUMENTS_FOUND" };
      }

      const context = relevantChunks.map((chunk) => chunk.content).join("\n\n");
      return { retrievedContext: context };
    });

    // Node 3: Generate answer using retrieved context (if applicable)
    workflow.addNode("generator", async (state: AgentStateType) => {
      const question = state.userQuestion;
      const context = state.retrievedContext;

      let systemPrompt = "";
      if (state.routingDecision === "direct" || context === "NO_DOCUMENTS_FOUND" || !context) {
        systemPrompt = `You are a precise AI assistant. Answer the user's question directly based on your knowledge. If a category context lookup was expected but no documents were found, politely note that no relevant indexed context was found before answering.`;
      } else {
        systemPrompt = `Context data:
${context}

Task: Answer the user's question using ONLY the context data above. Do not fabricate information not found in the context. If the context does not contain sufficient information, state this clearly.`;
      }

      console.log(`[Agent] Routing: "${state.routingDecision}", Category: "${state.category}" — running generator...`);

      let rawResponse = "";
      for await (const chunk of this.llmService.generateResponse(systemPrompt, question)) {
        rawResponse += chunk;
        if (state.onToken) {
          state.onToken(chunk);
        }
      }

      const answer = rawResponse.trim();
      if (!answer || answer.length === 0) {
        return { finalAnswer: "Failed to generate a response. Please try again." };
      }

      return { finalAnswer: answer };
    });

    // Node 4: Hallucination and context alignment guardrail
    workflow.addNode("guardrail", async (state: AgentStateType) => {
      const context = state.retrievedContext;
      const answer = state.finalAnswer;

      // If we bypassed retrieval or did not find matching context, skip verification
      if (state.routingDecision === "direct" || context === "NO_DOCUMENTS_FOUND" || !context) {
        return { finalAnswer: answer };
      }

      console.log(`[Agent] Running verification guardrail on answer...`);

      const guardrailPrompt = `You are a quality assurance auditor.
Verify if the following answer is fully supported by the provided context. If the answer claims facts not found in the context, respond with "FAIL" followed by a brief correction. Otherwise, respond with "PASS".

Context:
${context}

Answer:
${answer}

Response (PASS or FAIL + correction):`;

      try {
        let verification = "";
        for await (const chunk of this.llmService.generateResponse(
          guardrailPrompt,
          "Analyze context alignment. Reply with PASS or FAIL.",
        )) {
          verification += chunk;
        }

        const check = verification.trim();
        if (check.toUpperCase().startsWith("FAIL")) {
          const correction = check.substring(4).trim();
          console.warn(`[Agent] Guardrail triggered: Answer contains unsupported details. Appending warning.`);

          const warningText = `\n\n⚠️ *Note: The guardrail node flagged details in this response. Verification audit: ${correction}*`;
          if (state.onToken) {
            state.onToken(warningText);
          }
          return { finalAnswer: answer + warningText };
        }
      } catch (error) {
        console.warn("[Agent] Verification guardrail failed, skipping checks:", error);
      }

      return { finalAnswer: answer };
    });

    // Wires workflow nodes with conditional edges
    const routeDecision = (state: AgentStateType) => {
      if (state.routingDecision === "direct") {
        return "generator";
      }
      return "retriever";
    };

    /* eslint-disable @typescript-eslint/no-explicit-any -- LangGraph's node registration types do not contain dynamic runtime names */
    workflow.addEdge("__start__" as any, "analyzer" as any);
    workflow.addConditionalEdges("analyzer" as any, routeDecision as any, {
      generator: "generator",
      retriever: "retriever",
    } as any);
    workflow.addEdge("retriever" as any, "generator" as any);
    workflow.addEdge("generator" as any, "guardrail" as any);
    workflow.addEdge("guardrail" as any, "__end__" as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return workflow.compile();
  }
}
