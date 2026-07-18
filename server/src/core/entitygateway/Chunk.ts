import { Chunk } from '../entities'

export interface ScoredChunk {
  chunk: Chunk
  score: number // cosine similarity, 1 = identical
}

export interface ChunkLoader {
  getTopKByEmbedding(
    botId: string,
    queryEmbedding: number[],
    k: number
  ): Promise<ScoredChunk[]>
  countChunksByBotId(botId: string): Promise<number>
}

export interface ChunkPersistor {
  bulkInsertChunks(
    botId: string,
    chunks: Array<{ text: string; embedding: number[] }>
  ): Promise<Chunk[]>
  deleteChunksByBotId(botId: string): Promise<void>
}
