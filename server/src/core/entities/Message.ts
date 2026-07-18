import { MessageRole } from '../../codecs'

// Write-once — same immutability rationale as Chunk, no updatedAt.
export interface Message {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  createdAt: Date
}
