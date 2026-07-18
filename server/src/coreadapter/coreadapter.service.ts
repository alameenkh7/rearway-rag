import { FactoryProvider } from '@nestjs/common'
import {
  CoreS,
  AdminUserPersistenceS,
  BotPersistenceS,
  ChunkPersistenceS,
  SessionPersistenceS,
  MessagePersistenceS,
  DailyUsagePersistenceS,
  RetentionLeadPersistenceS,
  EmailServiceS,
  LoggerS,
  TokenServiceS,
  LlmServiceS,
  ScrapingServiceS,
  PdfExtractionServiceS,
  TransactionManagerS,
} from '../tokens'
import { initUseCases, UseCases } from '../core/usecases'
import { AdminUserPersistenceService } from '../infrastructure/SequelizePersistence/admin-user-persistence.service'
import { BotPersistenceService } from '../infrastructure/SequelizePersistence/bot-persistence.service'
import { ChunkPersistenceService } from '../infrastructure/SequelizePersistence/chunk-persistence.service'
import { SessionPersistenceService } from '../infrastructure/SequelizePersistence/session-persistence.service'
import { MessagePersistenceService } from '../infrastructure/SequelizePersistence/message-persistence.service'
import { DailyUsagePersistenceService } from '../infrastructure/SequelizePersistence/daily-usage-persistence.service'
import { RetentionLeadPersistenceService } from '../infrastructure/SequelizePersistence/retention-lead-persistence.service'
import { SequelizeTransactionManager } from '../infrastructure/SequelizePersistence/transaction-manager.service'
import { ResendEmailService } from '../infrastructure/Email/resend-email.service'
import { LoggerService } from '../infrastructure/Logger/logger.service'
import { JwtTokenService } from '../infrastructure/Auth/token-service.service'
import { OpenRouterService } from '../infrastructure/LLM/open-router.service'
import { ScrapingServiceImpl } from '../infrastructure/Ingestion/scraping.service'
import { PdfExtractionServiceImpl } from '../infrastructure/Ingestion/pdf-extraction.service'

export const coreAdapterService: FactoryProvider = {
  provide: CoreS,
  useFactory: (
    logger: LoggerService,
    emailService: ResendEmailService,
    tokenService: JwtTokenService,
    adminUserPersistence: AdminUserPersistenceService,
    botPersistence: BotPersistenceService,
    chunkPersistence: ChunkPersistenceService,
    sessionPersistence: SessionPersistenceService,
    messagePersistence: MessagePersistenceService,
    dailyUsagePersistence: DailyUsagePersistenceService,
    retentionLeadPersistence: RetentionLeadPersistenceService,
    llmService: OpenRouterService,
    scrapingService: ScrapingServiceImpl,
    pdfExtractionService: PdfExtractionServiceImpl,
    transactionManager: SequelizeTransactionManager
  ): UseCases =>
    initUseCases({
      logger,
      emailService,
      tokenService,
      adminUserLoader: adminUserPersistence,
      adminUserPersistor: adminUserPersistence,
      botLoader: botPersistence,
      botPersistor: botPersistence,
      chunkLoader: chunkPersistence,
      chunkPersistor: chunkPersistence,
      sessionLoader: sessionPersistence,
      sessionPersistor: sessionPersistence,
      messageLoader: messagePersistence,
      messagePersistor: messagePersistence,
      dailyUsageLoader: dailyUsagePersistence,
      dailyUsagePersistor: dailyUsagePersistence,
      retentionLeadLoader: retentionLeadPersistence,
      retentionLeadPersistor: retentionLeadPersistence,
      llmService,
      scrapingService,
      pdfExtractionService,
      transactionManager,
    }),
  inject: [
    LoggerS,
    EmailServiceS,
    TokenServiceS,
    AdminUserPersistenceS,
    BotPersistenceS,
    ChunkPersistenceS,
    SessionPersistenceS,
    MessagePersistenceS,
    DailyUsagePersistenceS,
    RetentionLeadPersistenceS,
    LlmServiceS,
    ScrapingServiceS,
    PdfExtractionServiceS,
    TransactionManagerS,
  ],
}
