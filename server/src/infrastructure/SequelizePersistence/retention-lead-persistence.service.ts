import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import {
  RetentionLeadLoader,
  RetentionLeadPersistor,
} from '../../core/entitygateway/RetentionLead'
import { RetentionLead } from '../../core/entities'
import { PlanTier } from '../../codecs'
import { RetentionLeadModel } from './models/RetentionLeadModel'

@Injectable()
export class RetentionLeadPersistenceService
  implements RetentionLeadLoader, RetentionLeadPersistor
{
  constructor(
    @InjectModel(RetentionLeadModel)
    private readonly model: typeof RetentionLeadModel
  ) {}

  async getRetentionLeadByEmail(email: string): Promise<RetentionLead | null> {
    const row = await this.model.findOne({ where: { email } })
    return row ? this.toEntity(row) : null
  }

  async upsertRetentionLead(input: {
    email: string
    companyName?: string
    plan: PlanTier
  }): Promise<RetentionLead> {
    const existing = await this.model.findOne({
      where: { email: input.email },
    })
    const now = new Date()

    if (existing) {
      await existing.update({
        lastActiveAt: now,
        companyName: input.companyName ?? existing.companyName,
        plan: input.plan,
      })
      return this.toEntity(existing)
    }

    const created = await this.model.create({
      email: input.email,
      companyName: input.companyName ?? null,
      plan: input.plan,
      capturedAt: now,
      lastActiveAt: now,
    })
    return this.toEntity(created)
  }

  private toEntity(row: RetentionLeadModel): RetentionLead {
    return {
      id: row.id,
      email: row.email,
      companyName: row.companyName ?? undefined,
      plan: row.plan as PlanTier,
      capturedAt: row.capturedAt,
      lastActiveAt: row.lastActiveAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
