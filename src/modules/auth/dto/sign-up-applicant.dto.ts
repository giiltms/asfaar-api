import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';
import { IsSame } from '../validators/is-same.validator';

export class ApplicantSignUpDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  readonly firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  readonly lastName!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  readonly email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  readonly password!: string;

  @ApiProperty({
    description: 'Confirm password',
    example: 'SecurePassword123!',
  })
  @IsString()
  @IsSame('password', {
    message: 'Confirm password must match password',
  })
  readonly confirmPassword!: string;

  @ApiProperty({
    description: 'List of center IDs to assign to the user',
    example: ['center-uuid-1', 'center-uuid-2'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  readonly centerIds?: string[];
}
