import * as jwt from 'jsonwebtoken'
import {
  VERIFICATION_TOKEN_TTL_MINUTES,
  SESSION_TOKEN_TTL_HOURS,
} from '../../core/constants'

// One shared secret for every token this app issues; tokens are
// differentiated by a `purpose` claim, which every guard checks strictly —
// a verification token must never be accepted where a session token is
// expected, or vice versa.
function getSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET
  if (!secret) throw new Error('AUTH_JWT_SECRET is not set')
  return secret
}

export interface VerificationTokenPayload {
  adminUserId: string
  email: string
  purpose: 'bot-creation'
}

export function signVerificationToken(
  payload: VerificationTokenPayload
): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: `${VERIFICATION_TOKEN_TTL_MINUTES}m`,
  })
}

export function verifyVerificationToken(
  token: string
): VerificationTokenPayload {
  const decoded = jwt.verify(token, getSecret()) as VerificationTokenPayload &
    jwt.JwtPayload
  if (decoded.purpose !== 'bot-creation') {
    throw new Error('Token purpose mismatch')
  }
  return decoded
}

export interface SessionTokenPayload {
  botId: string
  sessionId: string
  purpose: 'chat-session'
}

export function signSessionToken(payload: SessionTokenPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: `${SESSION_TOKEN_TTL_HOURS}h`,
  })
}

export function verifySessionToken(token: string): SessionTokenPayload {
  const decoded = jwt.verify(token, getSecret()) as SessionTokenPayload &
    jwt.JwtPayload
  if (decoded.purpose !== 'chat-session') {
    throw new Error('Token purpose mismatch')
  }
  return decoded
}
