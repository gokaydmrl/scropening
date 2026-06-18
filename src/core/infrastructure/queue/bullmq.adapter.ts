import { Job, Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { QueuePort } from "../../ports/queue.port";

/**
 * BullMQ adapter implementing the QueuePort interface.
 * Supports adding jobs with exponential backoff retries and consuming them via workers.
 */
export class BullMqAdapter implements QueuePort {
  private queues: Map<string, Queue<unknown>> = new Map();

  constructor(private readonly redisClient: IORedis) {}

  async addJob(queueName: string, data: Record<string, unknown>): Promise<void> {
    if (!this.queues.has(queueName)) {
      this.queues.set(
        queueName,
        new Queue(queueName, { connection: this.redisClient }),
      );
    }

    const queue = this.queues.get(queueName);
    await queue?.add("scrape_task", data, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async consume(
    queueName: string,
    processor: (data: Record<string, unknown>) => Promise<void>,
  ): Promise<void> {
    console.log(`[BullMQ] Worker listening on queue: [${queueName}]`);

    new Worker(
      queueName,
      async (job: Job) => {
        await processor(job.data);
      },
      {
        connection: this.redisClient,
        concurrency: 1,
      },
    );
  }
}
