import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Request } from 'express'
import * as crypto from 'crypto'
import { BotPersistenceS } from '../../../tokens'
import type { BotLoader } from '../../../core/entitygateway/Bot'
import type { Bot } from '../../../core/entities'
import {
  EmbedTokenInvalidError,
  ResourceNotFoundError,
} from '../../../shared/errors/domain.errors'

export interface RequestWithBot extends Request {
  bot?: Bot
}

// Not wired to any route yet in this slice — used starting with the Session
// slice's start-session and chat endpoints. Injects BotPersistenceS
// directly (not via CoreS/UseCases): guards are already infrastructure-layer
// code, so depending on a persistence-service token here is consistent with
// the architecture, not a violation of "controllers only inject CoreS."
@Injectable()
export class EmbedTokenGuard implements CanActivate {
  constructor(@Inject(BotPersistenceS) private readonly botLoader: BotLoader) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithBot>()
    const providedToken = request.headers['x-embed-token']

    if (typeof providedToken !== 'string' || !providedToken) {
      throw new EmbedTokenInvalidError()
    }

    const botId = request.params.botId as string
    const bot = await this.botLoader.getBotById(botId)
    if (!bot) throw new ResourceNotFoundError('bot')

    const expected = Buffer.from(bot.embedToken)
    const provided = Buffer.from(providedToken)

    if (
      expected.length !== provided.length ||
      !crypto.timingSafeEqual(expected, provided)
    ) {
      throw new EmbedTokenInvalidError()
    }

    request.bot = bot // saves the Session/Chat guards a second DB lookup
    return true
  }
}
