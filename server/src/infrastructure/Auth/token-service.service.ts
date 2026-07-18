import { Injectable } from '@nestjs/common'
import { TokenService } from '../../core/entitygateway/TokenService'
import { signVerificationToken, signSessionToken } from './jwt.util'

@Injectable()
export class JwtTokenService implements TokenService {
  signVerificationToken(payload: {
    adminUserId: string
    email: string
  }): string {
    return signVerificationToken({ ...payload, purpose: 'bot-creation' })
  }

  signSessionToken(payload: { botId: string; sessionId: string }): string {
    return signSessionToken({ ...payload, purpose: 'chat-session' })
  }
}
