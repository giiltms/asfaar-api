import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiProperty,
  ApiPropertyOptional,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsUUID,
  ValidateNested,
  IsNotEmpty,
  IsNotEmpty as IsNotEmptyValidator,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { LocalStorageService } from '@providers/localstorage/localstorage.service';
import { PrismaService } from '@providers/prisma/prisma.service';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import {
  BiometricCaptureService,
  CaptureRequest,
} from './services/biometric-capture.service';
import { UserContextService } from '@common/services/user-context.service';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { FingerPosition } from '@prisma/client';

export class FingerDataDto {
  @ApiProperty({
    description: 'Finger position according to ISO/IEC 19794-2:2005 standard',
    enum: FingerPosition,
    example: 'LEFT_THUMB',
  })
  @IsEnum(FingerPosition)
  @IsNotEmpty()
  position: FingerPosition;

  @ApiProperty({
    description: 'Base64 encoded ISO/IEC 19794-2:2005 minutiae template',
    example:
      'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
  })
  @IsString()
  @IsNotEmpty()
  templateData: string;

  @ApiPropertyOptional({
    description: 'Base64 encoded WSQ compressed fingerprint image (optional)',
    example:
      'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
  })
  @IsOptional()
  @IsString()
  wsqImageData?: string;
}

export class CaptureFingerprintsDto {
  @ApiPropertyOptional({
    description:
      'Optional submission ID to associate biometric data with a specific application',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

  @ApiProperty({
    description: 'Capture method used for fingerprint collection',
    enum: ['SLAP', 'INDIVIDUAL'],
    example: 'SLAP',
  })
  @IsEnum(['SLAP', 'INDIVIDUAL'])
  @IsNotEmpty()
  captureMethod: 'SLAP' | 'INDIVIDUAL';

  @ApiProperty({
    description: 'Device used for capture',
    example: 'Suprema RealScan-G10',
  })
  @IsString()
  @IsNotEmpty()
  captureDevice: string;

  @ApiProperty({
    description: 'Array of finger data to capture',
    type: [FingerDataDto],
    example: [
      {
        position: 'LEFT_THUMB',
        templateData:
          'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
        wsqImageData:
          'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
      },
      {
        position: 'LEFT_INDEX',
        templateData:
          'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FingerDataDto)
  fingers: FingerDataDto[];
}

export class ValidationResultDto {
  @ApiProperty({
    description: 'Whether the fingerprint template is valid',
    example: true,
  })
  isValid: boolean;

  @ApiProperty({
    description: 'Quality score of the fingerprint (0-100)',
    example: 85,
  })
  qualityScore: number;

  @ApiProperty({
    description:
      'NFIQ (NIST Fingerprint Image Quality) score (1-5, where 1 is best)',
    example: 2,
  })
  nfiqScore: number;

  @ApiProperty({
    description: 'Validation errors found',
    type: [String],
    example: [],
  })
  errors: string[];

  @ApiProperty({
    description: 'Validation warnings',
    type: [String],
    example: ['Template quality is below optimal threshold'],
  })
  warnings: string[];
}

export class CaptureResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the biometric data record',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  biometricDataId: string;

  @ApiProperty({
    description: 'Array of fingerprint data IDs created',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ],
  })
  fingerprintDataIds: string[];

  @ApiProperty({
    description: 'Whether the overall capture operation was successful',
    example: true,
  })
  overallSuccess: boolean;

  @ApiProperty({
    description: 'Validation results for each finger captured',
    type: [ValidationResultDto],
    example: [
      {
        isValid: true,
        qualityScore: 85,
        nfiqScore: 2,
        errors: [],
        warnings: [],
      },
      {
        isValid: true,
        qualityScore: 78,
        nfiqScore: 3,
        errors: [],
        warnings: ['Template quality is below optimal threshold'],
      },
    ],
  })
  validationResults: ValidationResultDto[];

  @ApiProperty({
    description: 'Overall errors encountered during capture',
    type: [String],
    example: [],
  })
  errors: string[];
}

export class BiometricDataDto {
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
    description: 'Capture device used',
    example: 'Suprema RealScan-G10',
  })
  captureDevice: string;

  @ApiProperty({
    description: 'Location where capture was performed',
    example: 'Booth 1, Center A, Lagos Office',
  })
  captureLocation: string;

  @ApiProperty({
    description: 'Method used for capture',
    enum: ['SLAP', 'INDIVIDUAL'],
    example: 'SLAP',
  })
  captureMethod: string;

  @ApiProperty({
    description: 'Number of fingers captured',
    example: 4,
  })
  fingerCount: number;

  @ApiProperty({
    description: 'Date and time when capture was performed',
    example: '2024-01-15T10:30:00Z',
  })
  capturedAt: string;

  @ApiProperty({
    description: 'User who performed the capture',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  capturedBy: string;
}

export class FingerprintDataDto {
  @ApiProperty({
    description: 'Unique identifier for the fingerprint data',
    example: 'finger-001',
  })
  id: string;

  @ApiProperty({
    description: 'Finger position',
    enum: FingerPosition,
    example: 'LEFT_THUMB',
  })
  fingerPosition: FingerPosition;

  @ApiProperty({
    description: 'Human-readable finger name',
    example: 'Left Thumb',
  })
  fingerName: string;

  @ApiProperty({
    description: 'Quality score of the fingerprint (0-100)',
    example: 85,
  })
  qualityScore: number;

  @ApiProperty({
    description: 'NFIQ score (1-5, where 1 is best)',
    example: 2,
  })
  nfiqScore: number;

  @ApiProperty({
    description: 'Whether the fingerprint quality is acceptable',
    example: true,
  })
  isAcceptable: boolean;

  @ApiProperty({
    description: 'Whether the fingerprint template is valid',
    example: true,
  })
  isTemplateValid: boolean;

  @ApiProperty({
    description: 'Date and time when captured',
    example: '2024-01-15T14:30:00.000Z',
  })
  capturedAt: string;

  @ApiProperty({
    description: 'Device used for capture',
    example: 'Suprema RealScan-G10 - ASFAAR-ABJ-HQ-Dev',
  })
  captureDevice: string;

  @ApiProperty({
    description: 'Method used for capture',
    example: 'LIVE_SCAN',
  })
  captureMethod: string;

  @ApiProperty({
    description: 'Decrypted template data (ISO/IEC 19794-2:2005 format)',
    example:
      'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
  })
  templateData: Buffer;

  @ApiPropertyOptional({
    description: 'Decrypted WSQ-compressed fingerprint image data (optional)',
    example:
      'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
  })
  wsqImageData?: Buffer;
}

export class BiometricDataListDto {
  @ApiProperty({
    description: 'Array of biometric data records',
    type: [BiometricDataDto],
  })
  data: BiometricDataDto[];

  @ApiProperty({
    description: 'Total number of records',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of records per page',
    example: 10,
  })
  limit: number;
}

export class FingerprintDataResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the biometric data record',
    example: 'abc12345-e89b-12d3-a456-426614174003',
  })
  id: string;

  @ApiProperty({
    description: 'User ID associated with the biometric data',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'Submission ID associated with the biometric data',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  submissionId: string;

  @ApiProperty({
    description: 'User information',
    example: {
      id: '456e7890-e89b-12d3-a456-426614174001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    },
  })
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description: 'Date and time when biometric data was captured',
    example: '2024-01-15T14:30:00.000Z',
  })
  capturedAt: string;

  @ApiProperty({
    description: 'Device used for capture',
    example: 'Suprema RealScan-G10',
  })
  captureDevice: string;

  @ApiProperty({
    description: 'Location where capture occurred',
    example: 'Lagos Biometric Center - Booth 1',
  })
  captureLocation: string;

  @ApiProperty({
    description: 'Whether the biometric data has been verified',
    example: false,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Current verification status',
    example: 'PENDING',
  })
  verificationStatus: string;

  @ApiProperty({
    description: 'Array of individual fingerprint data',
    type: [FingerprintDataDto],
    example: [
      {
        id: 'finger-001',
        fingerPosition: 'LEFT_THUMB',
        fingerName: 'Left Thumb',
        qualityScore: 85,
        nfiqScore: 2,
        isAcceptable: true,
        isTemplateValid: true,
        capturedAt: '2024-01-15T14:30:00.000Z',
        captureDevice: 'Suprema RealScan-G10',
        captureMethod: 'LIVE_SCAN',
        templateData:
          'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
        wsqImageData:
          'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
      },
      {
        id: 'finger-002',
        fingerPosition: 'RIGHT_THUMB',
        fingerName: 'Right Thumb',
        qualityScore: 78,
        nfiqScore: 3,
        isAcceptable: true,
        isTemplateValid: true,
        capturedAt: '2024-01-15T14:30:00.000Z',
        captureDevice: 'Suprema RealScan-G10',
        captureMethod: 'LIVE_SCAN',
        templateData:
          'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
        wsqImageData:
          'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
      },
      {
        id: 'finger-003',
        fingerPosition: 'LEFT_INDEX',
        fingerName: 'Left Index',
        qualityScore: 92,
        nfiqScore: 1,
        isAcceptable: true,
        isTemplateValid: true,
        capturedAt: '2024-01-15T14:30:00.000Z',
        captureDevice: 'Suprema RealScan-G10',
        captureMethod: 'LIVE_SCAN',
        templateData:
          'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
        wsqImageData:
          'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/',
      },
    ],
  })
  fingers: FingerprintDataDto[];
}

export class HealthCheckDto {
  @ApiProperty({
    description: 'Service status',
    example: 'healthy',
  })
  status: string;

  @ApiProperty({
    description: 'Service name',
    example: 'Biometric Capture Service',
  })
  service: string;

  @ApiProperty({
    description: 'Current timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Service version',
    example: '1.0.0',
  })
  version: string;
}

export class PhotoUploadDto {
  @ApiProperty({
    description: 'Application reference number (e.g., SA00125000001)',
    example: 'SA00125000001',
  })
  @IsString()
  @IsNotEmptyValidator()
  referenceNumber: string;
}

export class PhotoUploadResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Photo uploaded successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Uploaded photo data',
    example: {
      photoUrl:
        'https://api.asfaar.com/uploads/biometric-photos/SA00125000001_1705123456789_photo.jpg',
      photoHash: 'sha256:abc123def456...',
      photoSize: 2048000,
      photoMimeType: 'image/jpeg',
      referenceNumber: 'SA00125000001',
      uploadedAt: '2025-01-15T10:30:00.000Z',
    },
  })
  data: {
    photoUrl: string;
    photoHash: string;
    photoSize: number;
    photoMimeType: string;
    referenceNumber: string;
    uploadedAt: string;
  };

  @ApiProperty({
    description: 'Response timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  timestamp: string;
}

// Capture Status DTOs
export class FingerCaptureStatusDto {
  @ApiProperty({
    description: 'Finger position',
    enum: FingerPosition,
    example: 'LEFT_THUMB',
  })
  position: FingerPosition;

  @ApiProperty({ description: 'Finger name', example: 'Left Thumb' })
  fingerName: string;

  @ApiProperty({
    description: 'Whether this finger has been captured',
    example: true,
  })
  isCaptured: boolean;

  @ApiPropertyOptional({ description: 'Quality score (0-100)', example: 85 })
  qualityScore?: number;

  @ApiPropertyOptional({ description: 'NFIQ score (1-5)', example: 2 })
  nfiqScore?: number;

  @ApiPropertyOptional({ description: 'Whether acceptable', example: true })
  isAcceptable?: boolean;

  @ApiPropertyOptional({
    description: 'Capture timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  capturedAt?: string;

  @ApiPropertyOptional({ description: 'Number of attempts', example: 1 })
  captureAttempts?: number;

  @ApiPropertyOptional({
    description: 'ID of the officer who captured this finger',
    example: 'agent-123',
  })
  capturedBy?: string;
}

export class CaptureStatusResponseDto {
  @ApiProperty({
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  submissionId: string;

  @ApiProperty({
    description: 'Applicant information',
    example: {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
  })
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description: 'Photo capture status',
    example: {
      isCaptured: true,
      qualityScore: 92,
      capturedAt: '2025-01-15T10:25:00.000Z',
      capturedBy: 'agent-123',
    },
  })
  photo: {
    isCaptured: boolean;
    qualityScore?: number;
    capturedAt?: string;
    photoUrl?: string;
    capturedBy?: string;
  };

  @ApiProperty({
    description: 'Fingerprint capture status for each finger',
    type: [FingerCaptureStatusDto],
  })
  fingerprints: FingerCaptureStatusDto[];

  @ApiProperty({
    description: 'Overall completion status',
    example: {
      isComplete: false,
      completionPercentage: 75,
      missingItems: ['RIGHT_PINKY'],
    },
  })
  overallStatus: {
    isComplete: boolean;
    completionPercentage: number;
    missingItems: string[];
  };

  @ApiProperty({
    description: 'Timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  timestamp: string;
}

@ApiTags('Biometric Capture')
@Controller('biometric-capture')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class BiometricCaptureController {
  private readonly logger = new Logger(BiometricCaptureController.name);

  constructor(
    private readonly biometricCaptureService: BiometricCaptureService,
    private readonly userContextService: UserContextService,
    private readonly localStorageService: LocalStorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('capture')
  @Roles(
    UserRoles.BIOMETRIC_AGENT,
    UserRoles.CENTER_MANAGER,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Capture and store fingerprint data',
    description:
      'Capture fingerprint data using the specified biometric device. Stores ISO/IEC 19794-2:2005 templates with encryption. Device information is provided by the user, while booth and center information is automatically determined from user assignment.',
  })
  @ApiBody({ type: CaptureFingerprintsDto })
  @ApiResponse({
    status: 201,
    description: 'Fingerprint data captured and stored successfully',
    type: CaptureResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid fingerprint data, validation failed, or no booth assignment found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async captureFingerprints(
    @CurrentUser() user: JwtUserPayload,
    @Body() captureDto: CaptureFingerprintsDto,
  ): Promise<CaptureResponseDto> {
    this.logger.log(`Fingerprint capture request from user ${user.id}`);

    try {
      // Get user's booth and center context automatically
      const userContext =
        await this.userContextService.getUserActiveBoothContext(user.id);

      if (!userContext) {
        throw new BadRequestException(
          'No active booth or center assignment found. Please ensure you are assigned to a booth or managing a center.',
        );
      }

      // Convert base64 data to buffers
      const fingers = captureDto.fingers.map((finger) => ({
        position: finger.position,
        templateData: Buffer.from(finger.templateData, 'base64'),
        wsqImageData: finger.wsqImageData
          ? Buffer.from(finger.wsqImageData, 'base64')
          : undefined,
      }));

      const captureRequest: CaptureRequest = {
        userId: user.id,
        submissionId: captureDto.submissionId,
        captureDevice: captureDto.captureDevice,
        captureLocation:
          this.userContextService.formatLocationString(userContext),
        captureMethod: captureDto.captureMethod,
        fingers,
        capturedBy: user.id,
      };

      this.logger.log(
        `Capturing fingerprints at ${userContext.centerName} - Booth ${userContext.boothNumber}`,
      );

      const result = await this.biometricCaptureService.captureFingerprints(
        captureRequest,
      );

      return {
        biometricDataId: result.biometricDataId,
        fingerprintDataIds: result.fingerprintDataIds,
        overallSuccess: result.overallSuccess,
        validationResults: result.validationResults.map((vr) => ({
          isValid: vr.isValid,
          qualityScore: vr.qualityScore,
          nfiqScore: vr.nfiqScore,
          errors: vr.errors,
          warnings: vr.warnings,
        })),
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error('Fingerprint capture failed', error.stack);
      throw error;
    }
  }

  @Get('data/:userId')
  @Roles(
    UserRoles.BIOMETRIC_AGENT,
    UserRoles.CENTER_MANAGER,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
    UserRoles.VERIFICATION_OFFICER,
  )
  @ApiOperation({
    summary: 'Retrieve fingerprint data for a user',
    description:
      'Retrieve decrypted fingerprint data for verification or processing purposes. Returns both biometric data metadata and individual fingerprint records.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fingerprint data retrieved successfully',
    type: BiometricDataDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Fingerprint data not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getFingerprintData(
    @Param('userId') userId: string,
    @Query('submissionId') submissionId?: string,
  ) {
    this.logger.log(`Fingerprint data retrieval request for user ${userId}`);

    return await this.biometricCaptureService.getFingerprintData(
      userId,
      submissionId,
    );
  }

  @Get('data')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'List all fingerprint data (Admin only)',
    description:
      'Retrieve a list of all fingerprint data records for administrative purposes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fingerprint data list retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async listFingerprintData(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('userId') userId?: string,
    @Query('submissionId') submissionId?: string,
  ) {
    this.logger.log('Fingerprint data list request');

    // Implementation for listing all fingerprint data with pagination and filtering
    return await this.biometricCaptureService.listFingerprintData({
      page,
      limit,
      userId,
      submissionId,
    });
  }

  @Get('data/submission/:submissionId')
  @Roles(
    UserRoles.BIOMETRIC_AGENT,
    UserRoles.CENTER_MANAGER,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
    UserRoles.VERIFICATION_OFFICER,
  )
  @ApiOperation({
    summary: 'Get detailed fingerprint data by submission ID',
    description:
      'Retrieve complete decrypted fingerprint data associated with a specific form submission. This endpoint provides detailed fingerprint information including individual finger data, quality scores, and capture metadata. Use this endpoint when you need to review specific fingerprint details after viewing the summary in the verification dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fingerprint data retrieved successfully',
    type: FingerprintDataResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Fingerprint data not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getFingerprintDataBySubmissionId(
    @Param('submissionId') submissionId: string,
  ) {
    this.logger.log(
      `Fingerprint data retrieval request for submission ${submissionId}`,
    );

    return await this.biometricCaptureService.getFingerprintDataBySubmissionId(
      submissionId,
    );
  }

  @Delete('data/:biometricDataId')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete fingerprint data (Admin only)',
    description:
      'Soft delete fingerprint data for audit purposes. Data is retained for compliance.',
  })
  @ApiResponse({
    status: 204,
    description: 'Fingerprint data deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Fingerprint data not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async deleteFingerprintData(
    @CurrentUser() user: JwtUserPayload,
    @Param('biometricDataId') biometricDataId: string,
  ): Promise<void> {
    this.logger.log(
      `Fingerprint data deletion request for ${biometricDataId} by ${user.id}`,
    );

    await this.biometricCaptureService.deleteFingerprintData(
      biometricDataId,
      user.id,
    );
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check for biometric capture service',
    description: 'Check if the biometric capture service is operational.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
  })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'biometric-capture',
      version: '1.0.0',
    };
  }

  /**
   * Get capture status for an applicant by submission ID
   */
  @Get('status/submission/:submissionId')
  @Roles(
    UserRoles.BIOMETRIC_AGENT,
    UserRoles.CENTER_MANAGER,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
  )
  @ApiOperation({
    summary: 'Get biometric capture status for an applicant',
    description:
      'Get detailed capture status including photo and fingerprint capture progress for state management in Windows app',
  })
  @ApiParam({
    name: 'submissionId',
    description: 'Form submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Capture status retrieved successfully',
    type: CaptureStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Submission not found',
  })
  async getCaptureStatus(
    @Param('submissionId') submissionId: string,
  ): Promise<CaptureStatusResponseDto> {
    this.logger.log(`Getting capture status for submission ${submissionId}`);

    return await this.biometricCaptureService.getCaptureStatus(submissionId);
  }

  @Post('photo/:submissionId')
  @Roles(
    UserRoles.BIOMETRIC_AGENT,
    UserRoles.CENTER_MANAGER,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
  )
  @UseInterceptors(FileInterceptor('photo'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upload applicant photo by submission ID',
    description:
      'Upload a photo for an applicant using their form submission ID. The photo will be associated with their biometric data record. Supports JPEG, PNG, and WebP formats with a maximum size of 10MB.',
  })
  @ApiParam({
    name: 'submissionId',
    description: 'Form submission ID (UUID)',
    example: '6b7c0c62-6a8a-4b6f-9b7a-6d2f9c3a1b25',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Photo upload data',
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Photo file (JPEG, PNG, or WebP format, max 10MB)',
        },
      },
      required: ['photo'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Photo uploaded successfully',
    type: PhotoUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid submission ID, file format, or file size',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found for the given submission ID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async uploadPhoto(
    @CurrentUser() user: JwtUserPayload,
    @Param('submissionId') submissionId: string,
    @UploadedFile() photo: Express.Multer.File,
  ): Promise<PhotoUploadResponseDto> {
    this.logger.log(
      `Photo upload request for submission ${submissionId} by user ${user.id}`,
    );

    // Validate submission id format
    if (!submissionId || submissionId.length < 8) {
      throw new BadRequestException('Invalid submission ID format');
    }

    // Validate photo file
    if (!photo) {
      throw new BadRequestException('Photo file is required');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(photo.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP formats are allowed',
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (photo.size > maxSize) {
      throw new BadRequestException(
        'File size too large. Maximum size is 10MB',
      );
    }

    try {
      // Get user's booth and center context for capture location
      const userContext =
        await this.userContextService.getUserActiveBoothContext(user.id);

      if (!userContext) {
        throw new BadRequestException(
          'No active booth or center assignment found. Please ensure you are assigned to a booth or managing a center.',
        );
      }

      // Upload photo using the biometric capture service
      const result = await this.biometricCaptureService.uploadPhoto(
        submissionId,
        photo,
        user.id,
        userContext,
      );

      return {
        success: true,
        message: 'Photo uploaded successfully',
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Photo upload failed', error.stack);
      throw error;
    }
  }
}
