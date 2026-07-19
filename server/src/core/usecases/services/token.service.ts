import * as crypto from 'crypto'
import * as bcrypt from 'bcrypt'

const BCRYPT_ROUNDS = 10

// bcrypt is deliberately slow — a 6-digit OTP has low entropy (1e6 possibilities)
// and needs brute-force resistance that a fast hash wouldn't provide.
export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function hashOtpCode(code: string): Promise<string> {
  return bcrypt.hash(code, BCRYPT_ROUNDS)
}

export function compareOtpCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash)
}

// High-entropy random value — not a secret in the cryptographic sense once
// shipped into a public <script> embed, but raises the bar from "guess a
// UUID" to "guess a UUID plus this."
export function generateEmbedToken(): string {
  return crypto.randomBytes(24).toString('base64url')
}

// The session token itself is already high-entropy (it's a signed JWT) —
// hashing here is only so the DB never stores the literal valid token,
// not to resist brute force, so a plain fast hash is appropriate.
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Constant-time token comparison — same guarantee EmbedTokenGuard relies on,
// shared here so use cases don't hand-roll a `!==` that leaks timing.
export function safeCompareToken(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
