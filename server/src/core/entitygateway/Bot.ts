import { Bot } from '../entities'

export interface CreateBotPersistInput {
  adminUserId: string
  companyName: string
  businessType?: string
  websiteUrl?: string
  allowedOrigins?: string[]
  description?: string
  embedToken: string
  chunkCount: number
  expiresAt: Date
  tokenLimit: number
  fallbackMessage: string
  contactEmail: string
}

export interface BotLoader {
  getBotById(id: string): Promise<Bot | null>
  listExpiredTrialBots(cutoff: Date): Promise<Bot[]>
}

export interface BotPersistor {
  createBot(input: CreateBotPersistInput): Promise<Bot>
  incrementTokenUsage(id: string, tokens: number): Promise<void>
  deleteBot(id: string): Promise<void>
}
