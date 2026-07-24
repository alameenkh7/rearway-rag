import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { OriginNotAllowedError } from '../../../shared/errors/domain.errors'
import { RequestWithBot } from './embed-token.guard'

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^www\./, '')
}

// Runs after EmbedTokenGuard, which already attached `request.bot`. No-op
// (deliberate, documented gap — not an oversight) for PDF-only bots with no
// registered websiteUrl and no allowedOrigins: there is nothing to check the
// request's origin against, so protection narrows to the embed token +
// session token alone for those bots.
@Injectable()
export class OriginCheckGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithBot>()
    const bot = request.bot

    // websiteUrl is always allowed (it's the primary registered site);
    // allowedOrigins are additional domains registered at bot-creation time
    // (e.g. www variant, staging, or a second site embedding the same bot).
    const candidateOrigins = [
      ...(bot?.websiteUrl ? [bot.websiteUrl] : []),
      ...(bot?.allowedOrigins ?? []),
    ]
    if (candidateOrigins.length === 0) return true

    const originHeader = request.headers.origin || request.headers.referer
    if (!originHeader) throw new OriginNotAllowedError()

    let requestHostname: string
    try {
      requestHostname = normalizeHostname(new URL(originHeader).hostname)
    } catch {
      throw new OriginNotAllowedError()
    }

    const allowedHostnames = candidateOrigins
      .map((origin) => {
        try {
          return normalizeHostname(new URL(origin).hostname)
        } catch {
          return null
        }
      })
      .filter((hostname): hostname is string => hostname !== null)

    if (allowedHostnames.includes(requestHostname)) return true

    // Always allow our own origin. The hosted preview page
    // (/widget/preview/:botId) is served from this API's own host, so its
    // widget calls carry Origin: <this host> — which will never match the
    // customer's registered websiteUrl. Without this, previewing a bot that
    // registered a website would always 403.
    const selfHost = request.headers.host
    if (selfHost && normalizeHostname(selfHost.split(':')[0]) === requestHostname) {
      return true
    }

    throw new OriginNotAllowedError()
  }
}
