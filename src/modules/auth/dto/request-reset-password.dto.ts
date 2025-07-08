import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestResetPasswordDTO {
  @ApiProperty({ type: String })
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;
}
