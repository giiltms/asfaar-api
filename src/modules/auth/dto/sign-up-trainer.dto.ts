import {
  IsString,
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
  IsEnum,
  IsOptional,
  IsDateString,
  IsPhoneNumber,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { IsOlderThan } from '../validators/is-older-than.validator';
import { IsServiceYear } from '../validators/is-service-year.validator';
import { Transform } from 'class-transformer';

export class SignUpTrainerDTO {
  @ApiProperty({ type: String, example: 'mergermers@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({ type: String, example: 'Maryam' })
  @IsString()
  @IsNotEmpty()
  readonly firstName!: string;

  @ApiPropertyOptional({ type: String, example: 'Magama' })
  @IsString()
  @IsOptional()
  readonly middleName: string;

  @ApiProperty({ type: String, example: 'Ibrahim' })
  @IsString()
  @IsNotEmpty()
  readonly lastName!: string;

  @ApiProperty({ type: String, example: 'NYSC/2021/A/AB/1234' })
  @IsString()
  @IsNotEmpty()
  readonly callupNumber!: string;

  @ApiProperty({
    type: String,
    example: 'Kano',
    description: 'State of primary assignment',
  })
  @IsString()
  @IsNotEmpty()
  readonly statePA!: string;

  @ApiProperty({
    type: String,
    example: 'Ungogo',
    description: 'Local government of primary assignment',
  })
  @IsString()
  @IsNotEmpty()
  readonly lgaPA!: string;

  @ApiProperty({
    type: String,
    example: '08030300003',
    description: 'Phone number',
  })
  @IsNotEmpty()
  readonly phone!: string;

  @ApiProperty({
    example: Gender.MALE,
    examples: [Gender.MALE, Gender.FEMALE],
    description: 'Gender',
  })
  @IsEnum(Gender)
  @IsNotEmpty()
  readonly gender!: Gender;

  @ApiProperty({
    type: String,
    description: 'Date of birth (YYYY-MM-DD)',
    example: '2000-12-30',
  })
  @Transform(({ value }) => {
    return new Date(value).toISOString();
  })
  @IsDateString({})
  @IsNotEmpty()
  @IsOlderThan(18, { message: 'Date of birth must be at least 18 years ago' })
  readonly dob!: Date;

  @ApiProperty({
    type: String,
    example: 'Computer Science',
    description: 'Course studied',
  })
  @IsString()
  @IsNotEmpty()
  readonly course!: string;

  @ApiProperty({
    type: String,
    example: 'Batch A',
    description: 'Batch of Service',
  })
  @IsString()
  @IsNotEmpty()
  readonly batch!: string;

  @ApiProperty({
    type: String,
    example: 'Stream 1',
    examples: ['Stream 1', 'Stream 2', 'Stream 3'],
    description: 'Stream of Service',
  })
  @IsString()
  @IsNotEmpty()
  readonly stream!: string;

  @ApiProperty({
    type: Number,
    description: 'Service year (e.g., 2023)',
    example: 2023,
  })
  @IsString()
  @IsServiceYear({
    message:
      'Service year must be a valid year between last year and this year',
  })
  readonly serviceYear!: string;

  @ApiProperty({ type: String, default: 'string!12345' })
  @IsString()
  @Length(6, 20)
  @Matches(/[\d\W]/, {
    message:
      'password must contain at least one digit and/or special character',
  })
  @Matches(/[a-zA-Z]/, { message: 'password must contain at least one letter' })
  @Matches(/^\S+$/, { message: 'password must not contain spaces' })
  readonly password!: string;

  @ApiProperty({
    type: String,
    example: '01234567891',
    description: 'NIN Number',
  })
  @IsString()
  @MinLength(11, { message: 'NIN must be exactly 11 digits' })
  @MaxLength(11, { message: 'NIN must be exactly 11 digits' })
  @Matches(/^\d{11}$/, { message: 'NIN must be exactly 11 digits' })
  @IsOptional()
  readonly nin!: string;

  @ApiProperty({
    type: String,
    example: '01234567891',
    description: 'BVN Number',
  })
  @IsString()
  @MinLength(11, { message: 'BVN must be exactly 11 digits' })
  @MaxLength(11, { message: 'BVN must be exactly 11 digits' })
  @Matches(/^\d{11}$/, { message: 'BVN must be exactly 11 digits' })
  @IsNotEmpty()
  readonly bvn!: string;

  @ApiProperty({
    type: String,
    example: 'GTBank',
    description: 'Bank Name',
  })
  @IsString()
  @IsNotEmpty()
  readonly bankName!: string;

  @ApiPropertyOptional({
    type: String,
    example: '043',
    description: 'Bank Code',
  })
  @IsString()
  @IsOptional()
  readonly bankCode!: string;

  @ApiProperty({
    type: String,
    example: 'Maryam Ibrahim',
    description: 'Account Name',
  })
  @IsString()
  @IsNotEmpty()
  readonly accountName!: string;

  @ApiProperty({
    type: String,
    example: '0234567890',
    description: 'Account Number',
  })
  @IsString()
  @MinLength(10, { message: 'Account Number must be exactly 10 digits' })
  @MaxLength(10, { message: 'Account Number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Account Number must be exactly 10 digits' })
  @IsNotEmpty()
  readonly accountNumber!: string;
}
