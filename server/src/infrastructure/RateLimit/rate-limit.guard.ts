import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Request } from 'express'
import { DailyUsagePersistenceS, BotPersistenceS } from '../../tokens'
import type {
  DailyUsageLoader,
  DailyUsagePersistor,
} from '../../core/entitygateway/DailyUsage'
import type { BotLoader } from '../../core/entitygateway/Bot'
import { TRIAL_DAILY_MESSAGE_LIMIT } from '../../core/constants'
import { RateLimitExceededError } from '../../shared/errors/domain.errors'

const WHITELISTED_IPS = (process.env.WHITELISTED_IPS ?? '')
  .split(',')
  .map(ip => ip.trim())
  .filter(Boolean)

// Only limits trial bots — Instant/Business bots are unbounded here (they
// get their own anti-misuse cap later, per system-design-mvp.md §5). Runs
// last in the chat guard chain since it's the only one that writes to the
// DB, so it only fires once embed/origin/session have already proven the
// request legitimate.
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    @Inject(DailyUsagePersistenceS)
    private readonly dailyUsage: DailyUsageLoader & DailyUsagePersistor,
    @Inject(BotPersistenceS) private readonly botLoader: BotLoader
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()

    let ip =
      (request.headers['x-forwarded-for'] as string | undefined) ||
      request.socket.remoteAddress ||
      'unknown'
    if (ip.includes(',')) ip = ip.split(',')[0].trim()

    if (WHITELISTED_IPS.includes(ip)) return true

    const botId = request.params.botId as string
    const bot = await this.botLoader.getBotById(botId)
    if (!bot || bot.plan !== 'trial') return true // not a trial bot (or missing — the route handles 404)

    const today = new Date().toISOString().split('T')[0]
    const limit = Number(process.env.DAILY_LIMIT || TRIAL_DAILY_MESSAGE_LIMIT)

    const existing = await this.dailyUsage.getUsage(ip, botId, today)
    if (existing && existing.messageCount >= limit) {
      throw new RateLimitExceededError()
    }

    await this.dailyUsage.incrementUsage(ip, botId, today)
    return true
  }
}
