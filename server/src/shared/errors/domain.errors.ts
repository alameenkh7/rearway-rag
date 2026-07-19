import { BaseError } from './base.error'

export class ValidationError extends BaseError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', 400, message, details)
  }
}

// One generic not-found error, differentiated by errorCode/resource name —
// AdminUser/Bot/Session not-found all return the same shape, just a
// different errorCode, so callers don't need three near-identical classes.
export class ResourceNotFoundError extends BaseError {
  constructor(resource: string, message?: string) {
    super(
      `${resource.toUpperCase()}_NOT_FOUND`,
      404,
      message ?? `${resource} not found`
    )
  }
}

export class InvalidOtpError extends BaseError {
  constructor() {
    super('INVALID_OTP', 401, 'The code you entered is incorrect.')
  }
}

export class OtpExpiredError extends BaseError {
  constructor() {
    super(
      'OTP_EXPIRED',
      401,
      'This code has expired. Please request a new one.'
    )
  }
}

export class OtpLockedError extends BaseError {
  constructor() {
    super(
      'OTP_LOCKED',
      429,
      'Too many incorrect attempts. Please request a new code.'
    )
  }
}

export class OtpResendTooSoonError extends BaseError {
  constructor(retryAfterSeconds: number) {
    super(
      'OTP_RESEND_TOO_SOON',
      429,
      'Please wait before requesting another code.',
      {
        retryAfterSeconds,
      }
    )
  }
}

export class VerificationTokenInvalidError extends BaseError {
  constructor() {
    super(
      'VERIFICATION_TOKEN_INVALID',
      401,
      'This verification token is invalid.'
    )
  }
}

export class VerificationTokenExpiredError extends BaseError {
  constructor() {
    super(
      'VERIFICATION_TOKEN_EXPIRED',
      401,
      'This verification token has expired. Please verify your email again.'
    )
  }
}

export class EmbedTokenInvalidError extends BaseError {
  constructor() {
    super('EMBED_TOKEN_INVALID', 401, 'Invalid embed token.')
  }
}

export class OriginNotAllowedError extends BaseError {
  constructor() {
    super(
      'ORIGIN_NOT_ALLOWED',
      403,
      "This request did not originate from the bot's registered domain."
    )
  }
}

export class SessionTokenInvalidError extends BaseError {
  constructor() {
    super('SESSION_TOKEN_INVALID', 401, 'Invalid or revoked session token.')
  }
}

export class SessionExpiredError extends BaseError {
  constructor() {
    super(
      'session_expired',
      401,
      'This chat session has expired. Please refresh the page.'
    )
  }
}

export class TrialExpiredError extends BaseError {
  constructor(expiresAt: Date) {
    super(
      'trial_expired',
      402,
      `This bot's trial period ended on ${expiresAt.toLocaleDateString()}. Please upgrade to continue.`,
      { upgradeUrl: 'https://resolve.rearway.com/' }
    )
  }
}

export class TrialTokenLimitExceededError extends BaseError {
  constructor(tokenLimit: number) {
    super(
      'token_limit_reached',
      402,
      `This bot has used its ${tokenLimit.toLocaleString()} trial token allowance. Please upgrade to continue.`,
      { upgradeUrl: 'https://resolve.rearway.com/' }
    )
  }
}

export class RateLimitExceededError extends BaseError {
  constructor() {
    super(
      'rate_limit_exceeded',
      429,
      'You have reached your daily message limit for this demo. Please try again tomorrow.'
    )
  }
}

export class ContentSizeLimitExceededError extends BaseError {
  constructor(message: string) {
    super('CONTENT_SIZE_LIMIT_EXCEEDED', 413, message)
  }
}

export class IngestionFailedError extends BaseError {
  constructor(message: string) {
    super('INGESTION_FAILED', 422, message)
  }
}

// The upstream LLM provider (OpenRouter) rejected the request or is
// unreachable — e.g. a bad/expired API key, quota exhaustion, or an outage.
// This is our problem, not the caller's, but surfacing it as a typed 503 gives
// the frontend something actionable instead of an opaque 500 stack trace.
export class LlmServiceUnavailableError extends BaseError {
  constructor(details?: string) {
    super(
      'LLM_SERVICE_UNAVAILABLE',
      503,
      "We couldn't process your content right now. Please try again in a moment.",
      details ? { details } : undefined,
    )
  }
}
