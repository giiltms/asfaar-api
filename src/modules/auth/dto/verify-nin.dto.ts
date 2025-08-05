import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, Length, Matches } from 'class-validator';

export class VerifyNinDto {
  @ApiProperty({
    description: 'National Identification Number (11 digits)',
    example: '12345678901',
    minLength: 11,
    maxLength: 11,
  })
  @IsString()
  @Length(11, 11, { message: 'NIN must be exactly 11 digits' })
  @Matches(/^\d{11}$/, { message: 'NIN must contain only digits' })
  readonly nin!: string;

  @ApiProperty({
    description: 'Date of birth (YYYY-MM-DD)',
    example: '1990-01-15',
  })
  @IsDateString()
  readonly dateOfBirth!: string;
}

export class ConfirmNinDto {
  @ApiProperty({
    description: 'Temporary NIN verification ID',
    example: 'clxxx123456789',
  })
  @IsString()
  readonly tempNinId!: string;
}
