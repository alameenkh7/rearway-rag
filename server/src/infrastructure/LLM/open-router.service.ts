import { Injectable, Logger } from '@nestjs/common'
import OpenAI from 'openai'
import {
  GenerateAnswerInput,
  GenerateAnswerOutput,
  LlmService,
} from '../../core/entitygateway/LlmService'
import { LlmServiceUnavailableError } from '../../shared/errors/domain.errors'

const EMBED_MODEL = 'openai/text-embedding-3-small'
const CHAT_MODEL = 'openai/gpt-4o-mini'
const EMBED_BATCH_SIZE = 100

@Injectable()
export class OpenRouterService implements LlmService {
  private readonly logger = new Logger('OpenRouterService')
  private readonly client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://resolveapi.rearway.com',
        'X-Title': 'Resolve RAG',
      },
    })
  }

  // Wraps every provider call so an upstream failure (bad API key, quota,
  // outage) becomes a typed 503 instead of bubbling a raw SDK error up to
  // Nest's generic 500 handler. Logs the real cause server-side — the client
  // only ever sees the generic message.
  private async callProvider<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.logger.error(`${operation} failed: ${message}`)
      throw new LlmServiceUnavailableError(`${operation}: ${message}`)
    }
  }

  async embedChunks(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = []

    for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
      const batch = texts.slice(i, i + EMBED_BATCH_SIZE)
      const response = await this.callProvider('embedChunks', () =>
        this.client.embeddings.create({ model: EMBED_MODEL, input: batch }),
      )
      embeddings.push(...response.data.map(d => d.embedding))
    }

    return embeddings
  }

  async embedQuery(text: string): Promise<number[]> {
    const response = await this.callProvider('embedQuery', () =>
      this.client.embeddings.create({ model: EMBED_MODEL, input: [text] }),
    )
    return response.data[0].embedding
  }

  async generateAnswer(
    input: GenerateAnswerInput
  ): Promise<GenerateAnswerOutput> {
    const completion = await this.callProvider('generateAnswer', () =>
      this.client.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: input.systemPrompt },
          {
            role: 'user',
            content: `Context:\n${input.contextChunks.join('\n---\n')}\n\nQuestion: ${input.question}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.3,
      }),
    )

    const totalTokens = completion.usage?.total_tokens ?? 0
    const raw = completion.choices[0]?.message?.content ?? ''

    try {
      const parsed = JSON.parse(raw) as { answered?: unknown; text?: unknown }
      if (
        typeof parsed.answered === 'boolean' &&
        typeof parsed.text === 'string'
      ) {
        return { answered: parsed.answered, text: parsed.text, totalTokens }
      }
      throw new Error('Unexpected shape')
    } catch {
      // Malformed/unparsable model output fails safe into the fallback path
      // rather than crashing the request or leaking raw model text.
      this.logger.warn(
        `generateAnswer: could not parse model output as {answered,text}: ${raw.slice(0, 200)}`
      )
      return { answered: false, text: '', totalTokens }
    }
  }
}
