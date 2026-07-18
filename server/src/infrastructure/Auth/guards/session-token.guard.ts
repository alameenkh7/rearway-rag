import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Request } from 'express'
import * as jwt from 'jsonwebtoken'
import { verifySessionToken, SessionTokenPayload } from '../jwt.util'
import { hashSessionToken } from '../../../core/usecases/services/token.service'
import { SessionPersistenceS } from '../../../tokens'
import type { SessionLoader } from '../../../core/entitygateway/Session'
import {
  SessionTokenInvalidError,
  SessionExpiredError,
} from '../../../shared/errors/domain.errors'

export interface RequestWithSession extends Request {
  sessionId?: string
}

@Injectable()
export class SessionTokenGuard implements CanActivate {
  constructor(
    @Inject(SessionPersistenceS) private readonly sessionLoader: SessionLoader
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithSession>()
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) throw new SessionTokenInvalidError()

    const token = header.slice('Bearer '.length)

    let payload: SessionTokenPayload
    try {
      payload = verifySessionToken(token)
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) throw new SessionExpiredError()
      throw new SessionTokenInvalidError()
    }

    if (payload.botId !== request.params.botId)
      throw new SessionTokenInvalidError()

    const session = await this.sessionLoader.getSessionById(payload.sessionId)
    if (!session || session.status !== 'active')
      throw new SessionTokenInvalidError()

    // Recomputes and compares against the stored hash — this, not the JWT
    // signature alone, is what lets a specific session be revoked server-side
    // (e.g. by a future closeSession) without needing a JWT blacklist.
    if (hashSessionToken(token) !== session.tokenHash)
      throw new SessionTokenInvalidError()

    request.sessionId = session.id
    return true
  }
}
