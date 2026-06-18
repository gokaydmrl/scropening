export interface QueuePort {
  addJob(queueName: string, data: Record<string, unknown>): Promise<void>;
  consume(
    queueName: string,
    callback: (data: Record<string, unknown>) => Promise<void>,
  ): Promise<void>;
}
