import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { PaginationQueryDto } from '@common/dtos';

export class BiometricCaptureHistoryFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by specific center ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by agent who performed the capture',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  capturedBy?: string;

  @ApiPropertyOptional({
    description: 'Filter by verification status',
    enum: ['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'],
    example: 'VERIFIED',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'])
  verificationStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by verification status (boolean)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Filter captures from this date onwards',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter captures up to this date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by capture device',
    example: 'Suprema RealScan-G10',
  })
  @IsOptional()
  @IsString()
  captureDevice?: string;

  @ApiPropertyOptional({
    description: 'Filter by capture location',
    example: 'Booth 1, Center A',
  })
  @IsOptional()
  @IsString()
  captureLocation?: string;
}

export class BiometricCaptureHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by specific center ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by agent who performed the capture',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  capturedBy?: string;

  @ApiPropertyOptional({
    description: 'Filter by verification status',
    enum: ['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'],
    example: 'VERIFIED',
  })
  @IsOptional()
  @IsEnum(['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'])
  verificationStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by verification status (boolean)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Filter captures from this date onwards',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter captures up to this date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by capture device',
    example: 'Suprema RealScan-G10',
  })
  @IsOptional()
  @IsString()
  captureDevice?: string;

  @ApiPropertyOptional({
    description: 'Filter by capture location',
    example: 'Booth 1, Center A',
  })
  @IsOptional()
  @IsString()
  captureLocation?: string;
}

export class BiometricCaptureHistoryItemDto {
  @ApiProperty({
    description: 'Unique identifier for the biometric data',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID associated with the biometric data',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiPropertyOptional({
    description: 'Submission ID if associated with a specific application',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  submissionId?: string;

  @ApiProperty({
    description: 'User information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      nin: '12345678901',
      phone: '+2349012345678',
    },
  })
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    nin?: string;
    phone?: string;
  };

  @ApiPropertyOptional({
    description: 'Form submission information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      referenceNumber: 'SA25001234',
      status: 'SUBMITTED',
      submittedAt: '2024-01-15T10:00:00Z',
      appointment: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        appointmentTime: '2024-01-15T14:00:00Z',
        center: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'ASFAAR-ABUJA HQ',
          code: 'ASFAAR-ABJ-HQ',
          city: 'Abuja',
          state: 'FCT',
        },
      },
    },
  })
  submission?: {
    id: string;
    referenceNumber?: string;
    status: string;
    submittedAt?: Date;
    appointment?: {
      id: string;
      appointmentTime?: Date;
      center: {
        id: string;
        name: string;
        code: string;
        city: string;
        state: string;
      };
    };
  };

  @ApiProperty({
    description: 'Center information where capture was performed',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'ASFAAR-ABUJA HQ',
      code: 'ASFAAR-ABJ-HQ',
      city: 'Abuja',
      state: 'FCT',
    },
  })
  centerInfo?: {
    id: string;
    name: string;
    code: string;
    city: string;
    state: string;
  };

  @ApiProperty({
    description: 'Date and time when capture was performed',
    example: '2024-01-15T14:30:00Z',
  })
  capturedAt: Date;

  @ApiProperty({
    description: 'Agent who performed the capture',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  capturedBy: string;

  @ApiProperty({
    description: 'Device used for capture',
    example: 'Suprema RealScan-G10',
  })
  captureDevice: string;

  @ApiProperty({
    description: 'Location where capture was performed',
    example: 'Booth 1, ASFAAR-ABUJA HQ',
  })
  captureLocation: string;

  @ApiProperty({
    description: 'Whether the biometric data has been verified',
    example: true,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Current verification status',
    example: 'VERIFIED',
  })
  verificationStatus?: string;

  @ApiProperty({
    description: 'Number of fingerprints captured',
    example: 10,
  })
  fingerprintCount: number;

  @ApiProperty({
    description: 'Number of acceptable quality fingerprints',
    example: 9,
  })
  acceptableFingerprints: number;

  @ApiProperty({
    description: 'Total number of fingerprints',
    example: 10,
  })
  totalFingerprints: number;

  @ApiProperty({
    description: 'Individual fingerprint data',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        fingerPosition: { type: 'string' },
        fingerName: { type: 'string' },
        nfiqScore: { type: 'number' },
        qualityScore: { type: 'number' },
        isAcceptable: { type: 'boolean' },
        isTemplateValid: { type: 'boolean' },
        capturedAt: { type: 'string' },
        captureDevice: { type: 'string' },
        captureMethod: { type: 'string' },
      },
    },
  })
  fingerprintFingers: Array<{
    id: string;
    fingerPosition: string;
    fingerName: string;
    nfiqScore?: number;
    qualityScore?: number;
    isAcceptable: boolean;
    isTemplateValid: boolean;
    capturedAt?: Date;
    captureDevice?: string;
    captureMethod?: string;
  }>;
}

export class BiometricCaptureHistoryResponseDto {
  @ApiProperty({
    description: 'List of biometric captures',
    type: [BiometricCaptureHistoryItemDto],
  })
  data: BiometricCaptureHistoryItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      totalItems: 100,
      totalPages: 10,
      hasNextPage: true,
      hasPreviousPage: false,
    },
  })
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  @ApiProperty({
    description: 'Centers accessible to the manager',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        code: { type: 'string' },
      },
    },
  })
  managerCenters: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

export class BiometricCaptureStatisticsDto {
  @ApiProperty({
    description: 'Total number of captures',
    example: 150,
  })
  totalCaptures: number;

  @ApiProperty({
    description: 'Number of verified captures',
    example: 120,
  })
  verifiedCaptures: number;

  @ApiProperty({
    description: 'Number of pending captures',
    example: 20,
  })
  pendingCaptures: number;

  @ApiProperty({
    description: 'Number of rejected captures',
    example: 10,
  })
  rejectedCaptures: number;

  @ApiProperty({
    description: 'Verification rate percentage',
    example: 80.0,
  })
  verificationRate: number;

  @ApiProperty({
    description: 'Captures by date (last 30 days)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        count: { type: 'number' },
      },
    },
  })
  capturesByDate: Array<{
    date: string;
    count: number;
  }>;

  @ApiProperty({
    description: 'Centers accessible to the manager',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        code: { type: 'string' },
      },
    },
  })
  managerCenters: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}
