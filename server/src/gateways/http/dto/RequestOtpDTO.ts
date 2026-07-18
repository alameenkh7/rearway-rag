import { IsEmail } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RequestOtpDTO {
  @ApiProperty({
    description: 'Company admin email address',
    example: 'owner@example.com',
  })
  @IsEmail()
  email: string
}
