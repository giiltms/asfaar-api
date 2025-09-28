import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PassportType {
  ORDINARY = 'ORDINARY',
  DIPLOMATIC = 'DIPLOMATIC',
  OFFICIAL = 'OFFICIAL',
  EMERGENCY = 'EMERGENCY',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export class CreatePassportDto {
  @ApiProperty({
    description: 'Passport number',
    example: 'A12345678',
  })
  @IsString()
  @IsNotEmpty()
  passportNumber: string;

  @ApiPropertyOptional({
    description: 'Type of passport',
    enum: PassportType,
    example: PassportType.ORDINARY,
    default: PassportType.ORDINARY,
  })
  @IsOptional()
  @IsEnum(PassportType)
  passportType?: PassportType = PassportType.ORDINARY;

  @ApiProperty({
    description: 'Passport issue date',
    example: '2020-01-15T00:00:00.000Z',
  })
  @IsDateString()
  passportIssueDate: string;

  @ApiProperty({
    description: 'Passport expiry date',
    example: '2030-01-15T00:00:00.000Z',
  })
  @IsDateString()
  passportExpiryDate: string;

  @ApiProperty({
    description: 'Country that issued the passport (ISO 3166-1 alpha-3)',
    example: 'NGA',
  })
  @IsString()
  @IsNotEmpty()
  passportIssueCountry: string;

  @ApiPropertyOptional({
    description: 'Main passport photo URL',
    example: 'https://storage.example.com/passports/photo-123.jpg',
  })
  @IsOptional()
  @IsString()
  passportPhoto?: string;

  @ApiPropertyOptional({
    description: 'Front page scan URL',
    example: 'https://storage.example.com/passports/front-123.jpg',
  })
  @IsOptional()
  @IsString()
  passportFrontPhoto?: string;

  @ApiPropertyOptional({
    description: 'Back page scan URL',
    example: 'https://storage.example.com/passports/back-123.jpg',
  })
  @IsOptional()
  @IsString()
  passportBackPhoto?: string;

  @ApiPropertyOptional({
    description: 'Document size in bytes',
    example: 2048576,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  documentSize?: number;

  @ApiPropertyOptional({
    description: 'Additional passport metadata (MRZ, etc.)',
    example: {
      mrz: 'P<NGAJOHN<<DOE<<<<<<<<<<<<<<<<<<<<<<<<<<<A12345678NGA8001015M3001151<<<<<<<<<<<<<<08',
      issuingAuthority: 'Federal Ministry of Interior',
    },
  })
  @IsOptional()
  passportMetadata?: any;
}

export class CreatePassportMultipartDto {
  @ApiProperty({
    description: 'Passport number',
    example: 'A12345678',
  })
  @IsString()
  @IsNotEmpty()
  passportNumber: string;

  @ApiPropertyOptional({
    description: 'Type of passport',
    enum: PassportType,
    example: PassportType.ORDINARY,
    default: PassportType.ORDINARY,
  })
  @IsOptional()
  @IsEnum(PassportType)
  passportType?: PassportType = PassportType.ORDINARY;

  @ApiProperty({
    description: 'Passport issue date',
    example: '2020-01-15T00:00:00.000Z',
  })
  @IsDateString()
  passportIssueDate: string;

  @ApiProperty({
    description: 'Passport expiry date',
    example: '2030-01-15T00:00:00.000Z',
  })
  @IsDateString()
  passportExpiryDate: string;

  @ApiProperty({
    description: 'Country that issued the passport (ISO 3166-1 alpha-3)',
    example: 'NGA',
  })
  @IsString()
  @IsNotEmpty()
  passportIssueCountry: string;

  @ApiPropertyOptional({
    description: 'Main passport photo URL (if not uploading file)',
    example: 'https://storage.example.com/passports/photo-123.jpg',
  })
  @IsOptional()
  @IsString()
  passportPhoto?: string;

  @ApiPropertyOptional({
    description: 'Back page scan URL (if not uploading file)',
    example: 'https://storage.example.com/passports/back-123.jpg',
  })
  @IsOptional()
  @IsString()
  passportBackPhoto?: string;

  @ApiPropertyOptional({
    description: 'Additional passport metadata (MRZ, etc.)',
    example: {
      mrz: 'P<NGAJOHN<<DOE<<<<<<<<<<<<<<<<<<<<<<<<<<<A12345678NGA8001015M3001151<<<<<<<<<<<<<<08',
      issuingAuthority: 'Federal Ministry of Interior',
    },
  })
  @IsOptional()
  passportMetadata?: any;
}

export class UpdatePassportDto {
  @ApiPropertyOptional({
    description: 'Passport number',
    example: 'A12345678',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  passportNumber?: string;

  @ApiPropertyOptional({
    description: 'Type of passport',
    enum: PassportType,
    example: PassportType.ORDINARY,
  })
  @IsOptional()
  @IsEnum(PassportType)
  passportType?: PassportType;

  @ApiPropertyOptional({
    description: 'Passport issue date',
    example: '2020-01-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  passportIssueDate?: string;

  @ApiPropertyOptional({
    description: 'Passport expiry date',
    example: '2030-01-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  passportExpiryDate?: string;

  @ApiPropertyOptional({
    description: 'Country that issued the passport (ISO 3166-1 alpha-3)',
    example: 'NGA',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  passportIssueCountry?: string;

  @ApiPropertyOptional({
    description: 'Main passport photo URL',
    example: 'https://storage.example.com/passports/photo-123.jpg',
  })
  @IsOptional()
  @IsString()
  passportPhoto?: string;

  @ApiPropertyOptional({
    description: 'Front page scan URL',
    example: 'https://storage.example.com/passports/front-123.jpg',
  })
  @IsOptional()
  @IsString()
  passportFrontPhoto?: string;

  @ApiPropertyOptional({
    description: 'Back page scan URL',
    example: 'https://storage.example.com/passports/back-123.jpg',
  })
  @IsOptional()
  @IsString()
  passportBackPhoto?: string;

  @ApiPropertyOptional({
    description: 'Document size in bytes',
    example: 2048576,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  documentSize?: number;

  @ApiPropertyOptional({
    description: 'Additional passport metadata (MRZ, etc.)',
    example: {
      mrz: 'P<NGAJOHN<<DOE<<<<<<<<<<<<<<<<<<<<<<<<<<<A12345678NGA8001015M3001151<<<<<<<<<<<<<<08',
      issuingAuthority: 'Federal Ministry of Interior',
    },
  })
  @IsOptional()
  passportMetadata?: any;
}

export class VerifyPassportDto {
  @ApiProperty({
    description: 'Verification status',
    enum: VerificationStatus,
    example: VerificationStatus.VERIFIED,
  })
  @IsEnum(VerificationStatus)
  verificationStatus: VerificationStatus;

  @ApiPropertyOptional({
    description: 'Verification notes',
    example:
      'Document verified successfully. All details match official records.',
  })
  @IsOptional()
  @IsString()
  verificationNotes?: string;
}

export class PassportQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search term for passport number',
    example: 'A12345678',
  })
  @IsOptional()
  @IsString()
  passportNumber?: string;

  @ApiPropertyOptional({
    description: 'Filter by passport type',
    enum: PassportType,
    example: PassportType.ORDINARY,
  })
  @IsOptional()
  @IsEnum(PassportType)
  passportType?: PassportType;

  @ApiPropertyOptional({
    description: 'Filter by verification status',
    enum: VerificationStatus,
    example: VerificationStatus.VERIFIED,
  })
  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({
    description: 'Filter by issue country (ISO 3166-1 alpha-3)',
    example: 'NGA',
  })
  @IsOptional()
  @IsString()
  passportIssueCountry?: string;

  @ApiPropertyOptional({
    description: 'Filter by expiry date (show only expired passports)',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  expiredOnly?: boolean;
}
