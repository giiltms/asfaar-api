import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOTPDTO {
  @ApiProperty({ type: String })
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({ type: String, default: '123456' })
  @IsString()
  @Length(6)
  readonly otp!: string;
}
