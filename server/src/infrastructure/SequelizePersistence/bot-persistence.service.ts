import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import { Op } from 'sequelize'
import {
  BotLoader,
  BotPersistor,
  CreateBotPersistInput,
} from '../../core/entitygateway/Bot'
import { Bot } from '../../core/entities'
import { PlanTier, BotStatus } from '../../codecs'
import { BotModel } from './models/BotModel'

@Injectable()
export class BotPersistenceService implements BotLoader, BotPersistor {
  constructor(@InjectModel(BotModel) private readonly model: typeof BotModel) {}

  async getBotById(id: string): Promise<Bot | null> {
    const row = await this.model.findByPk(id)
    return row ? this.toEntity(row) : null
  }

  async listExpiredTrialBots(cutoff: Date): Promise<Bot[]> {
    const rows = await this.model.findAll({
      where: { plan: 'trial', createdAt: { [Op.lt]: cutoff } },
    })
    return rows.map(row => this.toEntity(row))
  }

  async createBot(input: CreateBotPersistInput): Promise<Bot> {
    const created = await this.model.create({
      adminUserId: input.adminUserId,
      companyName: input.companyName,
      businessType: input.businessType ?? null,
      websiteUrl: input.websiteUrl ?? null,
      allowedOrigins: input.allowedOrigins ?? null,
      description: input.description ?? null,
      plan: 'trial',
      embedToken: input.embedToken,
      status: 'active',
      chunkCount: input.chunkCount,
      tokenUsage: 0,
      tokenLimit: input.tokenLimit,
      expiresAt: input.expiresAt,
      fallbackMessage: input.fallbackMessage,
      contactEmail: input.contactEmail,
    })
    return this.toEntity(created)
  }

  async incrementTokenUsage(id: string, tokens: number): Promise<void> {
    const row = await this.model.findByPk(id)
    if (!row) return
    await row.increment('tokenUsage', { by: tokens })
  }

  async deleteBot(id: string): Promise<void> {
    await this.model.destroy({ where: { id } })
  }

  private toEntity(row: BotModel): Bot {
    return {
      id: row.id,
      adminUserId: row.adminUserId,
      companyName: row.companyName,
      businessType: row.businessType ?? undefined,
      websiteUrl: row.websiteUrl ?? undefined,
      allowedOrigins: row.allowedOrigins ?? undefined,
      description: row.description ?? undefined,
      plan: row.plan as PlanTier,
      embedToken: row.embedToken,
      status: row.status as BotStatus,
      chunkCount: row.chunkCount,
      tokenUsage: row.tokenUsage,
      tokenLimit: row.tokenLimit ?? undefined,
      expiresAt: row.expiresAt ?? undefined,
      fallbackMessage: row.fallbackMessage ?? undefined,
      contactEmail: row.contactEmail,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
