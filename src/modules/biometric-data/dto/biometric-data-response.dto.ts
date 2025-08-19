import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BiometricDataResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiPropertyOptional({ description: 'Form submission ID' })
  submissionId?: string;

  @ApiPropertyOptional({ description: 'URL to the captured photo' })
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Hash of the photo for integrity verification' })
  photoHash?: string;

  @ApiPropertyOptional({ description: 'Photo metadata' })
  photoMetadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Encrypted fingerprint template data' })
  fingerprintData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Hash of fingerprint data for integrity verification' })
  fingerprintHash?: string;

  @ApiPropertyOptional({ description: 'Fingerprint metadata' })
  fingerprintMetadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'URL to the captured signature' })
  signatureUrl?: string;

  @ApiPropertyOptional({ description: 'Hash of the signature for integrity verification' })
  signatureHash?: string;

  @ApiPropertyOptional({ description: 'Signature metadata' })
  signatureMetadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Photo quality score (0-100)' })
  photoQualityScore?: number;

  @ApiPropertyOptional({ description: 'Fingerprint quality score (0-100)' })
  fingerprintQualityScore?: number;

  @ApiPropertyOptional({ description: 'Overall quality score (0-100)' })
  overallQualityScore?: number;

  @ApiProperty({ description: 'Whether data has been verified', default: false })
  isVerified: boolean;

  @ApiPropertyOptional({ description: 'Verification status' })
  verificationStatus?: string;

  @ApiPropertyOptional({ description: 'Notes from verification process' })
  verificationNotes?: string;

  @ApiPropertyOptional({ description: 'ID of the biometric agent who captured the data' })
  capturedBy?: string;

  @ApiPropertyOptional({ description: 'When the data was captured' })
  capturedAt?: Date;

  @ApiPropertyOptional({ description: 'Device used for capture' })
  captureDevice?: string;

  @ApiPropertyOptional({ description: 'Location where capture occurred' })
  captureLocation?: string;

  @ApiProperty({ description: 'Whether data is encrypted', default: true })
  isEncrypted: boolean;

  @ApiPropertyOptional({ description: 'Reference to encryption key' })
  encryptionKey?: string;

  @ApiPropertyOptional({ description: 'Data retention policy' })
  dataRetentionPolicy?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Who created this record' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Last person who modified' })
  lastModifiedBy?: string;
}
