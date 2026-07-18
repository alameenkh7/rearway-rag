import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { OriginNotAllowedError } from '../../../shared/errors/domain.errors'
import { RequestWithBot } from './embed-token.guard'

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, '')
}

// Runs after EmbedTokenGuard, which already attached `request.bot`. No-op
// (deliberate, documented gap — not an oversight) for PDF-only bots with no
// registered websiteUrl: there is nothing to check the request's origin
// against, so protection narrows to the embed token + session token alone
// for those bots.
@Injectable()
export class OriginCheckGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithBot>()
    const bot = request.bot

    if (!bot?.websiteUrl) return true

    const originHeader = request.headers.origin || request.headers.referer
    if (!originHeader) throw new OriginNotAllowedError()

    let requestHostname: string
    let botHostname: string
    try {
      requestHostname = normalizeHostname(new URL(originHeader).hostname)
      botHostname = normalizeHostname(new URL(bot.websiteUrl).hostname)
    } catch {
      throw new OriginNotAllowedError()
    }

    if (requestHostname !== botHostname) throw new OriginNotAllowedError()

    return true
  }
}
