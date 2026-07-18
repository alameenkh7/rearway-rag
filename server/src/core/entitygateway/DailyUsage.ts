import { DailyUsage } from '../entities'

export interface DailyUsageLoader {
  getUsage(
    ipAddress: string,
    botId: string,
    date: string
  ): Promise<DailyUsage | null>
}

export interface DailyUsagePersistor {
  incrementUsage(
    ipAddress: string,
    botId: string,
    date: string
  ): Promise<DailyUsage>
}
