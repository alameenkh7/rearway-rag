import { SessionStatus } from '../../codecs'

export interface Session {
  id: string
  botId: string
  tokenHash: string
  status: SessionStatus
  ipAddress: string
  userAgent?: string
  createdAt: Date
  lastActivityAt: Date
  updatedAt: Date
}
