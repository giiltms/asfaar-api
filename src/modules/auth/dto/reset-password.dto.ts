import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDTO {
  @ApiProperty({
    description: 'Password reset token from email link',
    example: 'abc123def456...',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password' })
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}
