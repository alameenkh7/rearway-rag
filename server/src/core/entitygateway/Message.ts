import { Message } from '../entities'
import { MessageRole } from '../../codecs'

export interface MessageLoader {
  // Unused by any Trial controller yet — ready for Instant's transcript
  // view, zero extra cost to define alongside the rest of this entity.
  getMessagesBySessionId(sessionId: string): Promise<Message[]>
}

export interface MessagePersistor {
  createMessage(input: {
    sessionId: string
    role: MessageRole
    content: string
  }): Promise<Message>
}
