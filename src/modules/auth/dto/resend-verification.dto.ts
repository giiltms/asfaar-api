import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * DTO for resending email verification
 */
export class ResendVerificationDto {
  @ApiProperty({
    description: 'User email to resend verification to',
    example: 'demo@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
