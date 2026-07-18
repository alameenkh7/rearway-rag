import { v4 as uuidv4 } from 'uuid'
import { Deps } from '../../entitygateway'
import { SESSION_TOKEN_TTL_HOURS } from '../../constants'
import {
  ResourceNotFoundError,
  TrialExpiredError,
} from '../../../shared/errors/domain.errors'
import { hashSessionToken } from '../services/token.service'

export interface StartSessionInput {
  botId: string
  ipAddress: string
  userAgent?: string
}

export type StartSessionOutput = {
  message: string
  data: { sessionId: string; sessionToken: string; expiresIn: number }
}

export function makeUC(deps: Deps) {
  return async function startSession(
    input: StartSessionInput
  ): Promise<StartSessionOutput> {
    const { botLoader, sessionPersistor, tokenService } = deps

    const bot = await botLoader.getBotById(input.botId)
    if (!bot) throw new ResourceNotFoundError('bot')

    if (bot.expiresAt && bot.expiresAt < new Date()) {
      throw new TrialExpiredError(bot.expiresAt)
    }

    const sessionId = uuidv4()
    const sessionToken = tokenService.signSessionToken({
      botId: bot.id,
      sessionId,
    })
    const tokenHash = hashSessionToken(sessionToken)

    await sessionPersistor.createSession({
      id: sessionId,
      botId: bot.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      tokenHash,
    })

    return {
      message: 'Session started',
      data: {
        sessionId,
        sessionToken,
        expiresIn: SESSION_TOKEN_TTL_HOURS * 60 * 60,
      },
    }
  }
}

export const name = 'StartSession'
