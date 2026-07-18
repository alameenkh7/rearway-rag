import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/sequelize'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'
import {
  ChunkLoader,
  ChunkPersistor,
  ScoredChunk,
} from '../../core/entitygateway/Chunk'
import { Chunk } from '../../core/entities'
import { ChunkRow } from './models/ChunkRow'

// Sequelize has no `vector` column type, so this entire service bypasses
// the ORM and talks to the `chunks` table via parameterized raw SQL. No
// @Table-decorated model exists for it (see models/ChunkRow.ts) — this is a
// deliberate, contained deviation from the standard's "Sequelize model"
// checklist step. Every method still returns plain Chunk/ScoredChunk
// entities, so callers (CreateBot, SendMessage) use this exactly like any
// other Loader/Persistor.
@Injectable()
export class ChunkPersistenceService implements ChunkLoader, ChunkPersistor {
  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  private toPgVectorLiteral(embedding: number[]): string {
    return '[' + embedding.join(',') + ']'
  }

  async bulkInsertChunks(
    botId: string,
    chunks: Array<{ text: string; embedding: number[] }>
  ): Promise<Chunk[]> {
    const now = new Date()
    const inserted: Chunk[] = []

    for (const { text, embedding } of chunks) {
      const id = uuidv4()
      await this.sequelize.query(
        `INSERT INTO chunks (id, bot_id, text, embedding, created_at)
         VALUES (:id, :botId, :text, :embedding::vector, :createdAt)`,
        {
          replacements: {
            id,
            botId,
            text,
            embedding: this.toPgVectorLiteral(embedding),
            createdAt: now,
          },
          type: QueryTypes.INSERT,
        }
      )
      inserted.push({ id, botId, text, embedding, createdAt: now })
    }

    return inserted
  }

  async getTopKByEmbedding(
    botId: string,
    queryEmbedding: number[],
    k: number
  ): Promise<ScoredChunk[]> {
    const rows = await this.sequelize.query<ChunkRow>(
      `SELECT id, bot_id, text, created_at,
              1 - (embedding <=> :embedding::vector) AS score
       FROM chunks
       WHERE bot_id = :botId
       ORDER BY embedding <=> :embedding::vector
       LIMIT :k`,
      {
        replacements: {
          botId,
          embedding: this.toPgVectorLiteral(queryEmbedding),
          k,
        },
        type: QueryTypes.SELECT,
      }
    )

    return rows.map(row => ({
      chunk: {
        id: row.id,
        botId: row.bot_id,
        text: row.text,
        embedding: [], // never needed downstream of retrieval — not fetched back
        createdAt: new Date(row.created_at),
      },
      score: Number(row.score),
    }))
  }

  async countChunksByBotId(botId: string): Promise<number> {
    const rows = await this.sequelize.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM chunks WHERE bot_id = :botId`,
      { replacements: { botId }, type: QueryTypes.SELECT }
    )
    return Number(rows[0]?.count ?? 0)
  }

  async deleteChunksByBotId(botId: string): Promise<void> {
    await this.sequelize.query(`DELETE FROM chunks WHERE bot_id = :botId`, {
      replacements: { botId },
      type: QueryTypes.DELETE,
    })
  }
}
