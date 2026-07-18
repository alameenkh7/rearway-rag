import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import {
  MessageLoader,
  MessagePersistor,
} from '../../core/entitygateway/Message'
import { Message } from '../../core/entities'
import { MessageRole } from '../../codecs'
import { MessageModel } from './models/MessageModel'

@Injectable()
export class MessagePersistenceService
  implements MessageLoader, MessagePersistor
{
  constructor(
    @InjectModel(MessageModel) private readonly model: typeof MessageModel
  ) {}

  async getMessagesBySessionId(sessionId: string): Promise<Message[]> {
    const rows = await this.model.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']],
    })
    return rows.map(row => this.toEntity(row))
  }

  async createMessage(input: {
    sessionId: string
    role: MessageRole
    content: string
  }): Promise<Message> {
    const created = await this.model.create({
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
    })
    return this.toEntity(created)
  }

  private toEntity(row: MessageModel): Message {
    return {
      id: row.id,
      sessionId: row.sessionId,
      role: row.role as MessageRole,
      content: row.content,
      createdAt: row.createdAt,
    }
  }
}
