import { AgenticChatGraph } from "../agents/chat-agent.graph";
import { LlmPort } from "../ports/llm.port";
import { VectorStorePort } from "../ports/vector-store.port";
import { EmbeddingPort } from "../ports/embedding.port";

/**
 * A simple thread-safe asynchronous queue that buffers values
 * and presents them as an AsyncGenerator. Useful for bridging callback-based
 * streaming to generator-based API interfaces.
 */
class AsyncQueue<T> {
  private queue: T[] = [];
  private resolvers: ((value: IteratorResult<T>) => void)[] = [];
  private done = false;

  push(value: T) {
    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve({ value, done: false });
    } else {
      this.queue.push(value);
    }
  }

  close() {
    this.done = true;
    while (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve({ value: undefined as any, done: true });
    }
  }

  async *generator(): AsyncGenerator<T, void, unknown> {
    while (true) {
      if (this.queue.length > 0) {
        yield this.queue.shift()!;
      } else if (this.done) {
        return;
      } else {
        const nextValue = await new Promise<IteratorResult<T>>((resolve) => {
          this.resolvers.push(resolve);
        });
        if (nextValue.done) {
          return;
        }
        yield nextValue.value;
      }
    }
  }
}

/**
 * Orchestrates the agentic RAG chat pipeline.
 * Wires ports into the LangGraph agent and invokes it.
 *
 * Emits real-time tokens through an AsyncGenerator by mapping internal node
 * callbacks to the output stream.
 */
export class AgenticChatUseCase {
  constructor(
    private readonly llmService: LlmPort,
    private readonly vectorStoreRepo: VectorStorePort,
    private readonly embeddingService: EmbeddingPort,
  ) {}

  async *execute(question: string, category: string): AsyncGenerator<string, void, unknown> {
    const queue = new AsyncQueue<string>();

    const agentGraph = new AgenticChatGraph(
      this.llmService,
      this.vectorStoreRepo,
      this.embeddingService,
    );

    // Invoke graph in background. Nodes stream tokens via onToken callback.
    const invokePromise = agentGraph.buildGraph().invoke({
      userQuestion: question,
      category: category,
      onToken: (token: string) => {
        queue.push(token);
      },
    });

    invokePromise
      .then(() => {
        queue.close();
      })
      .catch((err) => {
        console.error("[AgenticChatUseCase] LangGraph execution failed:", err);
        queue.close();
      });

    // Stream tokens to the API layer in real time
    for await (const token of queue.generator()) {
      yield token;
    }

    // Await the promise to propagate any internal errors to the handler
    await invokePromise;
  }
}
