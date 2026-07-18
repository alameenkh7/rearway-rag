import { Module } from '@nestjs/common'
import { CoreadapterModule } from '../../coreadapter/coreadapter.module'
import { AuthController } from './auth.controller'
import { BotsController } from './bots.controller'
import { SessionsController } from './sessions.controller'
import { ChatController } from './chat.controller'
import { EmbedTokenGuard } from '../../infrastructure/Auth/guards/embed-token.guard'
import { OriginCheckGuard } from '../../infrastructure/Auth/guards/origin-check.guard'
import { SessionTokenGuard } from '../../infrastructure/Auth/guards/session-token.guard'
import { RateLimitGuard } from '../../infrastructure/RateLimit/rate-limit.guard'

@Module({
  imports: [CoreadapterModule],
  controllers: [
    AuthController,
    BotsController,
    SessionsController,
    ChatController,
  ],
  providers: [
    EmbedTokenGuard,
    OriginCheckGuard,
    SessionTokenGuard,
    RateLimitGuard,
  ],
})
export class HttpModule {}
