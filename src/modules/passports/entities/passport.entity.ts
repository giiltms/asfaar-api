import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PassportType, VerificationStatus } from '../dto/passport.dto';

export class PassportEntity {
  @ApiProperty({
    description: 'Unique identifier for the passport',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who owns this passport',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Passport number',
    example: 'A12345678',
  })
  passportNumber: string;

  @ApiProperty({
    description: 'Type of passport',
    enum: PassportType,
    example: PassportType.ORDINARY,
  })
  passportType: PassportType;

  @ApiProperty({
    description: 'Passport issue date',
    example: '2020-01-15T00:00:00.000Z',
  })
  passportIssueDate: Date;

  @ApiProperty({
    description: 'Passport expiry date',
    example: '2030-01-15T00:00:00.000Z',
  })
  passportExpiryDate: Date;

  @ApiProperty({
    description: 'Country that issued the passport (ISO 3166-1 alpha-3)',
    example: 'NGA',
  })
  passportIssueCountry: string;

  @ApiPropertyOptional({
    description: 'Main passport photo URL',
    example: 'https://storage.example.com/passports/photo-123.jpg',
  })
  passportPhoto?: string;

  @ApiPropertyOptional({
    description: 'Front page scan URL',
    example: 'https://storage.example.com/passports/front-123.jpg',
  })
  passportFrontPhoto?: string;

  @ApiPropertyOptional({
    description: 'Back page scan URL',
    example: 'https://storage.example.com/passports/back-123.jpg',
  })
  passportBackPhoto?: string;

  @ApiProperty({
    description: 'Whether the passport is verified',
    example: false,
  })
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'Current verification status',
    enum: VerificationStatus,
    example: VerificationStatus.PENDING,
  })
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({
    description: 'Verification notes',
    example: 'Document verified successfully',
  })
  verificationNotes?: string;

  @ApiPropertyOptional({
    description: 'Date when passport was verified',
    example: '2024-01-15T10:30:00.000Z',
  })
  verifiedAt?: Date;

  @ApiPropertyOptional({
    description: 'ID of user who verified the passport',
    example: '789e0123-e89b-12d3-a456-426614174002',
  })
  verifiedBy?: string;

  @ApiPropertyOptional({
    description: 'Document hash for integrity verification',
    example: 'sha256:abc123def456...',
  })
  documentHash?: string;

  @ApiPropertyOptional({
    description: 'Document size in bytes',
    example: 2048576,
  })
  documentSize?: number;

  @ApiPropertyOptional({
    description: 'Additional passport metadata (MRZ, etc.)',
    example: {
      mrz: 'P<NGAJOHN<<DOE<<<<<<<<<<<<<<<<<<<<<<<<<<<A12345678NGA8001015M3001151<<<<<<<<<<<<<<08',
      issuingAuthority: 'Federal Ministry of Interior',
    },
  })
  passportMetadata?: any;

  @ApiProperty({
    description: 'Date when passport was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Date when passport was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'ID of user who created the passport',
    example: '789e0123-e89b-12d3-a456-426614174002',
  })
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'ID of user who last modified the passport',
    example: '789e0123-e89b-12d3-a456-426614174002',
  })
  lastModifiedBy?: string;

  // Computed properties
  @ApiProperty({
    description: 'Whether the passport is expired',
    example: false,
  })
  isExpired: boolean;

  @ApiProperty({
    description: 'Days until expiry (negative if expired)',
    example: 1825,
  })
  daysUntilExpiry: number;
}
