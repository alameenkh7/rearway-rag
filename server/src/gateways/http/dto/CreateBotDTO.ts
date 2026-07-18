import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsValidWebsiteUrl } from '../validators/IsValidWebsiteUrl'

export class CreateBotDTO {
  @ApiProperty({ example: 'Acme Dental Clinic' })
  @IsString()
  @IsNotEmpty()
  companyName: string

  @ApiPropertyOptional({ example: 'Healthcare' })
  @IsOptional()
  @IsString()
  businessType?: string

  @ApiPropertyOptional({ example: 'https://acmedental.com' })
  @IsOptional()
  @IsValidWebsiteUrl()
  websiteUrl?: string

  @ApiPropertyOptional({
    description:
      'Manual business description, used alongside or instead of a PDF/website',
  })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({
    description:
      "Custom message shown when the bot can't answer from its content",
  })
  @IsOptional()
  @IsString()
  fallbackMessage?: string

  @ApiPropertyOptional({
    description:
      "Contact email shown in the fallback message; defaults to the admin's signup email",
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string
}
