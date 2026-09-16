import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestResetPasswordDTO {
  @ApiProperty({ type: String })
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;

  @ApiPropertyOptional({
    description:
      'Google reCAPTCHA token from the forgot-password form. Required unless ' +
      'RECAPTCHA_ENABLED=false; presence is enforced by RecaptchaGuard.',
    example: '03AGdBq24...',
  })
  @IsOptional()
  @IsString()
  readonly recaptchaToken?: string;
}
