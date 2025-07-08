import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, Validate } from 'class-validator';
import { IsDifferent } from '../validators/is-different.validator';

export class ChangePasswordDTO {
  @ApiProperty({ description: 'Old password', example: 'string!12345' })
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'string@12345',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'New password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  @Validate(IsDifferent)
  newPassword: string;
}
