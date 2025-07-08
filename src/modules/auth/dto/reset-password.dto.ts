import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDTO {
  @ApiProperty({ description: 'User ID' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Password reset token' })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password' })
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}
