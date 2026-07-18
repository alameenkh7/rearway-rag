import { IsEmail, IsString, Length } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class VerifyOtpDTO {
  @ApiProperty({
    description: 'Company admin email address',
    example: 'owner@example.com',
  })
  @IsEmail()
  email: string

  @ApiProperty({
    description: '6-digit verification code sent by email',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  code: string
}
