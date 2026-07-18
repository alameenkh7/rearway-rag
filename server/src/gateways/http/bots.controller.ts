import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { CoreS } from '../../tokens'
import type { UseCases } from '../../core/usecases'
import { CreateBotDTO } from './dto/CreateBotDTO'
import { BotStatusResponseDTO } from './dto/BotStatusResponseDTO'
import { HandleRagErrors } from '../../shared/decorators/handle-rag-errors.decorator'
import { VerificationTokenGuard } from '../../infrastructure/Auth/guards/verification-token.guard'
import { CurrentAdminUserId } from '../../infrastructure/Auth/decorators/current-admin-user-id.decorator'
import { CurrentAdminUserEmail } from '../../infrastructure/Auth/decorators/current-admin-user-email.decorator'
import { TRIAL_MAX_PDF_SIZE_MB } from '../../core/constants'

@ApiTags('Bots')
@Controller('api/v1/bots')
export class BotsController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post()
  @UseGuards(VerificationTokenGuard)
  @UseInterceptors(
    FileInterceptor('pdf', {
      storage: memoryStorage(),
      limits: { fileSize: TRIAL_MAX_PDF_SIZE_MB * 1024 * 1024 },
    })
  )
  @ApiBearerAuth('verification-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['companyName'],
      properties: {
        companyName: { type: 'string', example: 'Acme Dental Clinic' },
        businessType: { type: 'string', example: 'Healthcare' },
        websiteUrl: { type: 'string', example: 'https://acmedental.com' },
        description: { type: 'string' },
        fallbackMessage: { type: 'string' },
        contactEmail: { type: 'string', format: 'email' },
        pdf: {
          type: 'string',
          format: 'binary',
          description: `Optional PDF, up to ${TRIAL_MAX_PDF_SIZE_MB}MB`,
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Create a trial bot from a PDF, website, and/or description',
  })
  @ApiResponse({
    status: 201,
    description: 'Bot created — embedToken is returned here only, once',
  })
  @ApiResponse({
    status: 400,
    description:
      'No content source provided, or content yielded no usable text',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid verification token',
  })
  @ApiResponse({ status: 413, description: 'PDF exceeds the size limit' })
  @ApiResponse({
    status: 422,
    description:
      'Website scraping failed and no other content source was provided',
  })
  @HandleRagErrors('create-bot')
  async createBot(
    @Body() dto: CreateBotDTO,
    @UploadedFile() pdf: Express.Multer.File | undefined,
    @CurrentAdminUserId() adminUserId: string,
    @CurrentAdminUserEmail() adminUserEmail: string
  ) {
    const widgetHostUrl =
      process.env.WIDGET_HOST_URL || 'http://localhost:4001/widget'

    return this.useCases.commands.createBot({
      ...dto,
      adminUserId,
      adminUserEmail,
      pdfBuffer: pdf?.buffer,
      widgetHostUrl,
    })
  }

  @Get(':botId')
  @ApiParam({ name: 'botId', description: 'Bot id' })
  @ApiOperation({
    summary:
      'Get public bot status (no auth — botId is not sensitive once embedToken is stripped)',
  })
  @ApiResponse({ status: 200, type: BotStatusResponseDTO })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  @HandleRagErrors('get-bot-status')
  async getBotStatus(@Param('botId') botId: string) {
    return this.useCases.queries.getBotStatus({ botId })
  }
}
