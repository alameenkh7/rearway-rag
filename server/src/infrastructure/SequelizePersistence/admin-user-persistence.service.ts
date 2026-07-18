import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/sequelize'
import {
  AdminUserLoader,
  AdminUserPersistor,
} from '../../core/entitygateway/AdminUser'
import { AdminUser } from '../../core/entities'
import { AdminUserModel } from './models/AdminUserModel'

@Injectable()
export class AdminUserPersistenceService
  implements AdminUserLoader, AdminUserPersistor
{
  constructor(
    @InjectModel(AdminUserModel) private readonly model: typeof AdminUserModel
  ) {}

  async getAdminUserById(id: string): Promise<AdminUser | null> {
    const row = await this.model.findByPk(id)
    return row ? this.toEntity(row) : null
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | null> {
    const row = await this.model.findOne({ where: { email } })
    return row ? this.toEntity(row) : null
  }

  async upsertForOtpRequest(
    email: string,
    otpCodeHash: string,
    otpExpiresAt: Date
  ): Promise<AdminUser> {
    const existing = await this.model.findOne({ where: { email } })
    const otpLastSentAt = new Date()

    if (existing) {
      await existing.update({ otpCodeHash, otpExpiresAt, otpLastSentAt })
      return this.toEntity(existing)
    }

    const created = await this.model.create({
      email,
      otpCodeHash,
      otpExpiresAt,
      otpLastSentAt,
    })
    return this.toEntity(created)
  }

  async incrementOtpAttempts(id: string): Promise<AdminUser> {
    const row = await this.model.findByPk(id)
    if (!row) throw new Error(`AdminUser ${id} not found`)
    await row.increment('otpAttempts')
    await row.reload()
    return this.toEntity(row)
  }

  async verifyOtp(id: string): Promise<AdminUser> {
    const row = await this.model.findByPk(id)
    if (!row) throw new Error(`AdminUser ${id} not found`)
    // otpLastSentAt is deliberately left untouched — it tracks "when did we
    // last email this address," which must still gate the resend cooldown
    // even right after a successful verification, or the cooldown could be
    // bypassed by immediately re-verifying and re-requesting.
    await row.update({
      verifiedAt: new Date(),
      otpCodeHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    })
    return this.toEntity(row)
  }

  private toEntity(row: AdminUserModel): AdminUser {
    return {
      id: row.id,
      email: row.email,
      verifiedAt: row.verifiedAt ?? undefined,
      otpCodeHash: row.otpCodeHash ?? undefined,
      otpExpiresAt: row.otpExpiresAt ?? undefined,
      otpAttempts: row.otpAttempts,
      otpLastSentAt: row.otpLastSentAt ?? undefined,
      role: row.role as AdminUser['role'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
