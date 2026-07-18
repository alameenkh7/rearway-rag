import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/sequelize'
import { Sequelize } from 'sequelize-typescript'
import { QueryTypes } from 'sequelize'
import {
  DailyUsageLoader,
  DailyUsagePersistor,
} from '../../core/entitygateway/DailyUsage'
import { DailyUsage } from '../../core/entities'

// No Sequelize model for this table — the composite-key atomic increment
// (`ON CONFLICT ... DO UPDATE SET message_count = message_count + 1`) needs
// raw SQL to stay race-free; a model-based upsert() would overwrite the
// counter instead of incrementing it. Same rationale as chunks, just for a
// different reason (composite PK atomicity vs. missing column type).
interface DailyUsageRow {
  ip_address: string
  bot_id: string
  date: string
  message_count: number
}

@Injectable()
export class DailyUsagePersistenceService
  implements DailyUsageLoader, DailyUsagePersistor
{
  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  async getUsage(
    ipAddress: string,
    botId: string,
    date: string
  ): Promise<DailyUsage | null> {
    const rows = await this.sequelize.query<DailyUsageRow>(
      `SELECT ip_address, bot_id, date, message_count FROM daily_usage
       WHERE ip_address = :ipAddress AND bot_id = :botId AND date = :date`,
      { replacements: { ipAddress, botId, date }, type: QueryTypes.SELECT }
    )
    return rows[0] ? this.toEntity(rows[0]) : null
  }

  async incrementUsage(
    ipAddress: string,
    botId: string,
    date: string
  ): Promise<DailyUsage> {
    const rows = await this.sequelize.query<DailyUsageRow>(
      `INSERT INTO daily_usage (ip_address, bot_id, date, message_count)
       VALUES (:ipAddress, :botId, :date, 1)
       ON CONFLICT (ip_address, bot_id, date)
       DO UPDATE SET message_count = daily_usage.message_count + 1
       RETURNING ip_address, bot_id, date, message_count`,
      { replacements: { ipAddress, botId, date }, type: QueryTypes.SELECT }
    )
    return this.toEntity(rows[0])
  }

  private toEntity(row: DailyUsageRow): DailyUsage {
    return {
      ipAddress: row.ip_address,
      botId: row.bot_id,
      date: row.date,
      messageCount: row.message_count,
    }
  }
}
