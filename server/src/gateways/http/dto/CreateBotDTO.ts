import { IsString, IsNotEmpty, IsOptional, IsEmail, IsArray } from 'class-validator'
import { Transform } from 'class-transformer'
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
    type: [String],
    description:
      "Additional domains allowed to embed this bot's widget, beyond websiteUrl (which is always allowed automatically). Each entry must be a full URL with scheme, e.g. https://acmedental.com. Use this for www/bare-domain variants, staging domains, or multiple sites. Accepts either a JSON array or a JSON-encoded array string (this endpoint is multipart/form-data, where a single text field arrives as a string).",
    example: ['https://acmedental.com', 'https://www.acmedental.com'],
  })
  @IsOptional()
  // multipart/form-data delivers a lone text field as a string, not an
  // array — accept a JSON-encoded array string as well as a real array.
  @Transform(({ value }: { value: unknown }): unknown => {
    if (typeof value !== 'string') return value
    try {
      const parsed: unknown = JSON.parse(value)
      return parsed
    } catch {
      return [value]
    }
  })
  @IsArray()
  @IsValidWebsiteUrl({ each: true })
  allowedOrigins?: string[]

  @ApiPropertyOptional({
    description: 'Manual business description, used alongside or instead of a PDF/website',
  })
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({
    description: "Custom message shown when the bot can't answer from its content",
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
