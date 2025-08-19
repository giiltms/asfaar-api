import { IsOptional, IsString, IsNumber, IsBoolean, IsObject, IsUUID, IsUrl, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBiometricDataDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Form submission ID' })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

  @ApiPropertyOptional({ description: 'URL to the captured photo' })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Hash of the photo for integrity verification' })
  @IsOptional()
  @IsString()
  photoHash?: string;

  @ApiPropertyOptional({ description: 'Photo metadata (dimensions, format, etc.)' })
  @IsOptional()
  @IsObject()
  photoMetadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Encrypted fingerprint template data' })
  @IsOptional()
  @IsObject()
  fingerprintData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Hash of fingerprint data for integrity verification' })
  @IsOptional()
  @IsString()
  fingerprintHash?: string;

  @ApiPropertyOptional({ description: 'Fingerprint metadata (quality scores, etc.)' })
  @IsOptional()
  @IsObject()
  fingerprintMetadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'URL to the captured signature' })
  @IsOptional()
  @IsUrl()
  signatureUrl?: string;

  @ApiPropertyOptional({ description: 'Hash of the signature for integrity verification' })
  @IsOptional()
  @IsString()
  signatureHash?: string;

  @ApiPropertyOptional({ description: 'Signature metadata' })
  @IsOptional()
  @IsObject()
  signatureMetadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Photo quality score (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  photoQualityScore?: number;

  @ApiPropertyOptional({ description: 'Fingerprint quality score (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  fingerprintQualityScore?: number;

  @ApiPropertyOptional({ description: 'Overall quality score (0-100)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  overallQualityScore?: number;

  @ApiPropertyOptional({ description: 'ID of the biometric agent who captured the data' })
  @IsOptional()
  @IsString()
  capturedBy?: string;

  @ApiPropertyOptional({ description: 'Device used for capture' })
  @IsOptional()
  @IsString()
  captureDevice?: string;

  @ApiPropertyOptional({ description: 'Location where capture occurred' })
  @IsOptional()
  @IsString()
  captureLocation?: string;

  @ApiPropertyOptional({ description: 'Whether data is encrypted', default: true })
  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;

  @ApiPropertyOptional({ description: 'Reference to encryption key' })
  @IsOptional()
  @IsString()
  encryptionKey?: string;

  @ApiPropertyOptional({ description: 'Data retention policy' })
  @IsOptional()
  @IsString()
  dataRetentionPolicy?: string;
}
