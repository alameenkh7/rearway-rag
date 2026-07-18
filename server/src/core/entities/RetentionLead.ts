import { PlanTier } from '../../codecs'

// Deliberately NOT a foreign key off Bot — written once at OTP-request time
// and never cascades when a trial bot's data is hard-deleted after 15 days.
// This is the only record retention-marketing email can be built from once
// a trial bot is gone.
export interface RetentionLead {
  id: string
  email: string
  companyName?: string
  plan: PlanTier
  capturedAt: Date
  lastActiveAt: Date
  createdAt: Date
  updatedAt: Date
}
