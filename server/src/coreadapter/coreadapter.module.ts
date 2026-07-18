import { Module } from '@nestjs/common'
import { SequelizeModule } from '@nestjs/sequelize'
import {
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
} from '../tokens'
import { AdminUserModel } from '../infrastructure/SequelizePersistence/models/AdminUserModel'
import { BotModel } from '../infrastructure/SequelizePersistence/models/BotModel'
import { SessionModel } from '../infrastructure/SequelizePersistence/models/SessionModel'
import { MessageModel } from '../infrastructure/SequelizePersistence/models/MessageModel'
import { RetentionLeadModel } from '../infrastructure/SequelizePersistence/models/RetentionLeadModel'
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
import { coreAdapterService } from './coreadapter.service'

@Module({
  imports: [
    SequelizeModule.forFeature([
      AdminUserModel,
      BotModel,
      SessionModel,
      MessageModel,
      RetentionLeadModel,
    ]),
  ],
  providers: [
    { provide: LoggerS, useClass: LoggerService },
    { provide: EmailServiceS, useClass: ResendEmailService },
    { provide: TokenServiceS, useClass: JwtTokenService },
    { provide: AdminUserPersistenceS, useClass: AdminUserPersistenceService },
    { provide: BotPersistenceS, useClass: BotPersistenceService },
    { provide: ChunkPersistenceS, useClass: ChunkPersistenceService },
    { provide: SessionPersistenceS, useClass: SessionPersistenceService },
    { provide: MessagePersistenceS, useClass: MessagePersistenceService },
    { provide: DailyUsagePersistenceS, useClass: DailyUsagePersistenceService },
    {
      provide: RetentionLeadPersistenceS,
      useClass: RetentionLeadPersistenceService,
    },
    { provide: LlmServiceS, useClass: OpenRouterService },
    { provide: ScrapingServiceS, useClass: ScrapingServiceImpl },
    { provide: PdfExtractionServiceS, useClass: PdfExtractionServiceImpl },
    { provide: TransactionManagerS, useClass: SequelizeTransactionManager },
    coreAdapterService,
  ],
  exports: [
    coreAdapterService,
    BotPersistenceS,
    SessionPersistenceS,
    DailyUsagePersistenceS,
  ],
})
export class CoreadapterModule {}
