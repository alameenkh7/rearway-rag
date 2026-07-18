import {
  Body,
  Controller,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger'
import { CoreS } from '../../tokens'
import type { UseCases } from '../../core/usecases'
import { SendMessageDTO } from './dto/SendMessageDTO'
import { HandleRagErrors } from '../../shared/decorators/handle-rag-errors.decorator'
import { EmbedTokenGuard } from '../../infrastructure/Auth/guards/embed-token.guard'
import { OriginCheckGuard } from '../../infrastructure/Auth/guards/origin-check.guard'
import { SessionTokenGuard } from '../../infrastructure/Auth/guards/session-token.guard'
import { RateLimitGuard } from '../../infrastructure/RateLimit/rate-limit.guard'
import { CurrentSessionId } from '../../infrastructure/Auth/decorators/current-session-id.decorator'

@ApiTags('Chat')
@Controller('api/v1/bots')
export class ChatController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post(':botId/chat')
  // Cheapest/most-likely-to-reject checks first: embed token and Origin are
  // pure header comparisons, session token requires a DB lookup, rate limit
  // does a DB write last so it only fires once the request has already
  // proven itself legitimate.
  @UseGuards(
    EmbedTokenGuard,
    OriginCheckGuard,
    SessionTokenGuard,
    RateLimitGuard
  )
  @ApiSecurity('embed-token')
  @ApiBearerAuth('session-token')
  @ApiParam({ name: 'botId', description: 'Bot id' })
  @ApiOperation({ summary: 'Send a chat message to a bot' })
  @ApiResponse({
    status: 201,
    description:
      'type: "answer" with the answer, or type: "fallback" with a contact message',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing/invalid embed token or session token',
  })
  @ApiResponse({
    status: 402,
    description: 'Trial expired or token allowance used up',
  })
  @ApiResponse({
    status: 403,
    description: "Origin doesn't match the bot's registered website",
  })
  @ApiResponse({
    status: 429,
    description: 'Daily message limit reached for this IP/bot',
  })
  @HandleRagErrors('send-message')
  async sendMessage(
    @Param('botId') botId: string,
    @Body() dto: SendMessageDTO,
    @CurrentSessionId() sessionId: string
  ) {
    return this.useCases.commands.sendMessage({
      botId,
      sessionId,
      message: dto.message,
    })
  }
}
