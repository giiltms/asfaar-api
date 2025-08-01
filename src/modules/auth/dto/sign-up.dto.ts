import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsPhoneNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Gender } from '@prisma/client';
import { Roles } from '@modules/app/app.roles';

export class SignUpDTO {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  readonly email!: string;

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
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  readonly password!: string;

  @ApiProperty({
    description: 'User roles',
    enum: Roles,
    isArray: true,
    default: [Roles.APPLICANT],
    examples: [Roles.APPLICANT, Roles.ADMIN],
  })
  @IsArray()
  @IsEnum(Roles, { each: true })
  readonly roles!: Roles[];

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber()
  readonly phone?: string;

  @ApiProperty({
    description: 'User gender',
    enum: Gender,
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender)
  readonly gender?: Gender;

  @ApiProperty({
    description: 'National Identity Number',
    example: '12345678901',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly nin?: string;

  @ApiProperty({
    description: 'User state or province',
    example: 'Lagos',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly state?: string;

  @ApiProperty({
    description: 'Local Government Area',
    example: 'Eti-Osa',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly lga?: string;
}
