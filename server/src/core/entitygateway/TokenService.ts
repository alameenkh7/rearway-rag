// Port for anything that needs to *sign* a token from within core (verifying
// tokens is guard/infrastructure-only work — see infrastructure/Auth/jwt.util.ts
// — but signing is invoked from a use case, so it needs a port rather than
// core importing infrastructure directly).
export interface TokenService {
  signVerificationToken(payload: { adminUserId: string; email: string }): string
  signSessionToken(payload: { botId: string; sessionId: string }): string
}
