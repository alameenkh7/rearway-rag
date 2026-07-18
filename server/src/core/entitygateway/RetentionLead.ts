import { RetentionLead } from '../entities'
import { PlanTier } from '../../codecs'

export interface RetentionLeadLoader {
  getRetentionLeadByEmail(email: string): Promise<RetentionLead | null>
}

export interface RetentionLeadPersistor {
  // Create if missing (capturedAt=now); if it exists, update lastActiveAt=now
  // and companyName/plan if provided — never deleted by the trial purge job.
  upsertRetentionLead(input: {
    email: string
    companyName?: string
    plan: PlanTier
  }): Promise<RetentionLead>
}
