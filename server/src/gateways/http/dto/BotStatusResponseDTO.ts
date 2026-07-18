import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// Swagger documentation shape only — not validated (it's a response, not a
// request body). Mirrors BotPublic (Bot minus embedToken).
export class BotStatusResponseDTO {
  @ApiProperty()
  id: string

  @ApiProperty()
  adminUserId: string

  @ApiProperty()
  companyName: string

  @ApiPropertyOptional()
  businessType?: string

  @ApiPropertyOptional()
  websiteUrl?: string

  @ApiPropertyOptional()
  description?: string

  @ApiProperty({ enum: ['trial', 'instant', 'business'] })
  plan: string

  @ApiProperty({ enum: ['active', 'expired'] })
  status: string

  @ApiProperty()
  chunkCount: number

  @ApiProperty()
  tokenUsage: number

  @ApiPropertyOptional()
  tokenLimit?: number

  @ApiPropertyOptional()
  expiresAt?: Date

  @ApiPropertyOptional()
  fallbackMessage?: string

  @ApiProperty()
  contactEmail: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
