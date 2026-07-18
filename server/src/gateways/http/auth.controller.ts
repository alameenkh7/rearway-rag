import { Body, Controller, Inject, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CoreS } from '../../tokens'
import type { UseCases } from '../../core/usecases'
import { RequestOtpDTO } from './dto/RequestOtpDTO'
import { VerifyOtpDTO } from './dto/VerifyOtpDTO'
import { HandleRagErrors } from '../../shared/decorators/handle-rag-errors.decorator'

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post('otp/request')
  @ApiOperation({ summary: 'Request a one-time verification code by email' })
  @ApiResponse({
    status: 201,
    description: 'Code sent (or dev-logged if no email provider is configured)',
  })
  @ApiResponse({
    status: 429,
    description: 'Resend requested before the cooldown elapsed',
  })
  @HandleRagErrors('request-otp')
  async requestOtp(@Body() dto: RequestOtpDTO) {
    return this.useCases.commands.requestOtp(dto)
  }

  @Post('otp/verify')
  @ApiOperation({
    summary: 'Verify the code and receive a one-shot bot-creation token',
  })
  @ApiResponse({
    status: 201,
    description:
      'Verified — returns a short-lived verification token for POST /bots',
  })
  @ApiResponse({
    status: 401,
    description:
      'Code is wrong, expired, or no code was requested for this email',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many incorrect attempts — request a new code',
  })
  @HandleRagErrors('verify-otp')
  async verifyOtp(@Body() dto: VerifyOtpDTO) {
    return this.useCases.commands.verifyOtp(dto)
  }
}
