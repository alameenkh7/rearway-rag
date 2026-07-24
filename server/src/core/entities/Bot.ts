import { PlanTier, BotStatus } from '../../codecs'

export interface Bot {
  id: string
  adminUserId: string
  companyName: string
  businessType?: string
  websiteUrl?: string
  // Additional domains (beyond websiteUrl) allowed to embed this bot's
  // widget — checked by OriginCheckGuard alongside websiteUrl.
  allowedOrigins?: string[]
  // Free-text manual-content source from creation — folded into chunks and
  // never re-read, kept here for creation-time provenance/audit only.
  description?: string
  plan: PlanTier
  embedToken: string
  status: BotStatus
  chunkCount: number
  tokenUsage: number
  tokenLimit?: number
  expiresAt?: Date
  fallbackMessage?: string
  contactEmail: string
  createdAt: Date
  updatedAt: Date
}

// The embed token is returned exactly once, from CreateBot — every other
// read of a Bot (status checks, etc.) uses this shape instead.
export type BotPublic = Omit<Bot, 'embedToken'>
