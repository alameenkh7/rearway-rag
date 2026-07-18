import { IsNotEmpty, IsString, MaxLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SendMessageDTO {
  @ApiProperty({ example: 'What are your opening hours?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string
}
