import { Deps } from '../../entitygateway'
import { RETRIEVAL_CONFIDENCE_THRESHOLD, TOP_K_CHUNKS } from '../../constants'
import {
  ResourceNotFoundError,
  SessionTokenInvalidError,
  TrialExpiredError,
  TrialTokenLimitExceededError,
} from '../../../shared/errors/domain.errors'

export interface SendMessageInput {
  botId: string
  sessionId: string
  message: string
}

export type SendMessageOutput =
  | { type: 'answer'; answer: string; sessionId: string }
  | {
      type: 'fallback'
      fallback: { message: string; contactEmail: string }
      sessionId: string
    }

const SYSTEM_PROMPT_TEMPLATE = (companyName: string) =>
  `You are a helpful assistant for ${companyName}. Answer ONLY using the provided context. ` +
  `Respond with a JSON object of exactly this shape: {"answered": boolean, "text": string}. ` +
  `Set "answered" to true and "text" to your answer if the context contains the information needed. ` +
  `Set "answered" to false and "text" to an empty string if the context does not contain the answer — ` +
  `never guess or use outside knowledge.`

export function makeUC(deps: Deps) {
  return async function sendMessage(
    input: SendMessageInput
  ): Promise<SendMessageOutput> {
    const {
      botLoader,
      botPersistor,
      sessionLoader,
      sessionPersistor,
      messagePersistor,
      chunkLoader,
      llmService,
    } = deps

    const bot = await botLoader.getBotById(input.botId)
    if (!bot) throw new ResourceNotFoundError('bot')

    if (bot.expiresAt && bot.expiresAt < new Date()) {
      throw new TrialExpiredError(bot.expiresAt)
    }
    if (bot.tokenLimit !== undefined && bot.tokenUsage >= bot.tokenLimit) {
      throw new TrialTokenLimitExceededError(bot.tokenLimit)
    }

    // Defense in depth — SessionTokenGuard already verified the token and
    // loaded the session, but the use case re-validates the relationship
    // rather than trusting the guard blindly.
    const session = await sessionLoader.getSessionById(input.sessionId)
    if (!session || session.botId !== bot.id || session.status !== 'active') {
      throw new SessionTokenInvalidError()
    }
    await sessionPersistor.touchLastActivity(session.id)

    await messagePersistor.createMessage({
      sessionId: session.id,
      role: 'visitor',
      content: input.message,
    })

    const fallback = {
      message: bot.fallbackMessage ?? '',
      contactEmail: bot.contactEmail,
    }
    const respondWithFallback = async (): Promise<SendMessageOutput> => {
      await messagePersistor.createMessage({
        sessionId: session.id,
        role: 'bot',
        content: fallback.message,
      })
      return { type: 'fallback', fallback, sessionId: session.id }
    }

    const queryEmbedding = await llmService.embedQuery(input.message)
    const scored = await chunkLoader.getTopKByEmbedding(
      bot.id,
      queryEmbedding,
      TOP_K_CHUNKS
    )

    // Tier 1 — retrieval-confidence gate: skip the LLM call entirely when
    // nothing in the bot's content is relevant enough to answer from.
    if (
      scored.length === 0 ||
      scored[0].score < RETRIEVAL_CONFIDENCE_THRESHOLD
    ) {
      return respondWithFallback()
    }

    const generated = await llmService.generateAnswer({
      systemPrompt: SYSTEM_PROMPT_TEMPLATE(bot.companyName),
      contextChunks: scored.map(s => s.chunk.text),
      question: input.message,
    })

    // The LLM call happened either way, so token usage is charged regardless
    // of whether it resulted in an answer or a self-reported "can't answer."
    await botPersistor.incrementTokenUsage(bot.id, generated.totalTokens)

    // Tier 2 — generation-time self-report: context passed the confidence
    // gate but the model still couldn't answer from it.
    if (!generated.answered) {
      return respondWithFallback()
    }

    await messagePersistor.createMessage({
      sessionId: session.id,
      role: 'bot',
      content: generated.text,
    })
    return { type: 'answer', answer: generated.text, sessionId: session.id }
  }
}

export const name = 'SendMessage'
