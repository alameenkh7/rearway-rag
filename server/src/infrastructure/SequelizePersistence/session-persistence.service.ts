import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import {
  SessionLoader,
  SessionPersistor,
} from '../../core/entitygateway/Session'
import { Session } from '../../core/entities'
import { SessionStatus } from '../../codecs'
import { SessionModel } from './models/SessionModel'

@Injectable()
export class SessionPersistenceService
  implements SessionLoader, SessionPersistor
{
  constructor(
    @InjectModel(SessionModel) private readonly model: typeof SessionModel
  ) {}

  async getSessionById(id: string): Promise<Session | null> {
    const row = await this.model.findByPk(id)
    return row ? this.toEntity(row) : null
  }

  async createSession(input: {
    id: string
    botId: string
    ipAddress: string
    userAgent?: string
    tokenHash: string
  }): Promise<Session> {
    const created = await this.model.create({
      id: input.id,
      botId: input.botId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent ?? null,
      tokenHash: input.tokenHash,
      status: 'active',
      lastActivityAt: new Date(),
    })
    return this.toEntity(created)
  }

  async touchLastActivity(id: string): Promise<void> {
    await this.model.update({ lastActivityAt: new Date() }, { where: { id } })
  }

  async deleteSessionsByBotId(botId: string): Promise<void> {
    await this.model.destroy({ where: { botId } })
  }

  private toEntity(row: SessionModel): Session {
    return {
      id: row.id,
      botId: row.botId,
      tokenHash: row.tokenHash,
      status: row.status as SessionStatus,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent ?? undefined,
      createdAt: row.createdAt,
      lastActivityAt: row.lastActivityAt,
      updatedAt: row.updatedAt,
    }
  }
}
