import { Logger } from './Logger'
import { EmailService } from './EmailService'
import { AdminUserLoader, AdminUserPersistor } from './AdminUser'
import { TokenService } from './TokenService'
import { BotLoader, BotPersistor } from './Bot'
import { ChunkLoader, ChunkPersistor } from './Chunk'
import { SessionLoader, SessionPersistor } from './Session'
import { MessageLoader, MessagePersistor } from './Message'
import { DailyUsageLoader, DailyUsagePersistor } from './DailyUsage'
import { RetentionLeadLoader, RetentionLeadPersistor } from './RetentionLead'
import { LlmService } from './LlmService'
import { ScrapingService } from './ScrapingService'
import { PdfExtractionService } from './PdfExtractionService'
import { TransactionManager } from './TransactionManager'

export * from './Logger'
export * from './EmailService'
export * from './AdminUser'
export * from './TokenService'
export * from './Bot'
export * from './Chunk'
export * from './Session'
export * from './Message'
export * from './DailyUsage'
export * from './RetentionLead'
export * from './LlmService'
export * from './ScrapingService'
export * from './PdfExtractionService'
export * from './TransactionManager'

export interface Deps {
  logger: Logger
  emailService: EmailService
  tokenService: TokenService
  adminUserLoader: AdminUserLoader
  adminUserPersistor: AdminUserPersistor
  botLoader: BotLoader
  botPersistor: BotPersistor
  chunkLoader: ChunkLoader
  chunkPersistor: ChunkPersistor
  sessionLoader: SessionLoader
  sessionPersistor: SessionPersistor
  messageLoader: MessageLoader
  messagePersistor: MessagePersistor
  dailyUsageLoader: DailyUsageLoader
  dailyUsagePersistor: DailyUsagePersistor
  retentionLeadLoader: RetentionLeadLoader
  retentionLeadPersistor: RetentionLeadPersistor
  llmService: LlmService
  scrapingService: ScrapingService
  pdfExtractionService: PdfExtractionService
  transactionManager: TransactionManager
}
