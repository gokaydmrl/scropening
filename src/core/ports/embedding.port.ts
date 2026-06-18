export interface EmbeddingPort {
  createEmbedding(text: string): Promise<number[]>;
}
