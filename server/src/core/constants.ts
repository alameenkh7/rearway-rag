// Single source of truth for every trial/business constant. See
// docs/system-design-mvp.md and the implementation plan's "Open items"
// section for which of these are firm decisions vs. proposed defaults.

// Empirically calibrated against openai/text-embedding-3-small, not a
// guessed value: live testing showed clearly in-scope questions scoring
// 0.42-0.64 cosine similarity against their answer chunk, while clearly
// out-of-scope questions scored 0.04-0.14 against the same content. 0.3
// sits with a healthy margin on both sides of that gap. The original
// design doc proposed 0.75 as a placeholder "confirm once real content is
// being tested" — this is that confirmation; 0.75 would have rejected
// nearly every legitimate answer.
export const RETRIEVAL_CONFIDENCE_THRESHOLD = 0.3
export const TOP_K_CHUNKS = 4

export const TRIAL_TOKEN_LIMIT = 50_000
export const TRIAL_ACCESS_WINDOW_DAYS = 30
export const TRIAL_HARD_DELETE_DAYS = 15
export const TRIAL_DAILY_MESSAGE_LIMIT = 15

export const TRIAL_MAX_PDF_SIZE_MB = 10
export const TRIAL_MAX_SCRAPE_PAGES = 10

export const OTP_EXPIRY_MINUTES = 10
export const OTP_RESEND_COOLDOWN_SECONDS = 60
export const OTP_MAX_ATTEMPTS = 5

export const VERIFICATION_TOKEN_TTL_MINUTES = 30
export const SESSION_TOKEN_TTL_HOURS = 24

export const DEFAULT_FALLBACK_MESSAGE =
  "I don't have that specific information — contact us at {contactEmail} and we'll help directly."

export const CHUNK_SIZE_CHARS = 500
export const CHUNK_OVERLAP_CHARS = 50
export const MAX_CONTENT_CHARS = 200_000
