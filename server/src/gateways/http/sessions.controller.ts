import {
  Controller,
  Headers,
  Inject,
  Ip,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger'
import { CoreS } from '../../tokens'
import type { UseCases } from '../../core/usecases'
import { HandleRagErrors } from '../../shared/decorators/handle-rag-errors.decorator'
import { EmbedTokenGuard } from '../../infrastructure/Auth/guards/embed-token.guard'
import { OriginCheckGuard } from '../../infrastructure/Auth/guards/origin-check.guard'

@ApiTags('Sessions')
@Controller('api/v1/bots')
export class SessionsController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post(':botId/session')
  @UseGuards(EmbedTokenGuard, OriginCheckGuard)
  @ApiSecurity('embed-token')
  @ApiParam({ name: 'botId', description: 'Bot id' })
  @ApiOperation({
    summary:
      'Start a chat session for a bot — called once by the widget on load',
  })
  @ApiResponse({
    status: 201,
    description: 'Session started — returns a session token for POST /chat',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid X-Embed-Token' })
  @ApiResponse({ status: 402, description: 'Trial expired' })
  @ApiResponse({
    status: 403,
    description: "Origin doesn't match the bot's registered website",
  })
  @HandleRagErrors('start-session')
  async startSession(
    @Param('botId') botId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string
  ) {
    return this.useCases.commands.startSession({
      botId,
      ipAddress: ip,
      userAgent,
    })
  }
}
