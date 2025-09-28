import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID, IsArray } from 'class-validator';

// New enums for correct verification officer actions
export enum VerificationAction {
  FLAGGED = 'FLAGGED',
  QUERIED = 'QUERIED',
  PROCESSING = 'PROCESSING',
}

export enum SecurityDepartment {
  FINANCE = 'FINANCE',
  EMBASSY_OFFICER = 'EMBASSY_OFFICER',
  LIAISON_OFFICER = 'LIAISON_OFFICER',
  AUTHORITY = 'AUTHORITY',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

// Enhanced flagging enums
export enum FlagType {
  SECURITY_CONCERN = 'SECURITY_CONCERN',
  DOCUMENT_ISSUE = 'DOCUMENT_ISSUE',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  INCOMPLETE_INFORMATION = 'INCOMPLETE_INFORMATION',
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  OTHER = 'OTHER',
}

export enum PriorityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// DTO for flagging an application to security
export class FlagApplicationDto {
  @ApiProperty({ description: 'Application submission ID' })
  @IsUUID()
  submissionId: string;

  @ApiProperty({
    description: 'Security department to send to',
    enum: SecurityDepartment,
  })
  @IsEnum(SecurityDepartment)
  targetDepartment: SecurityDepartment;

  @ApiProperty({
    description: 'Type of flag',
    enum: FlagType,
  })
  @IsEnum(FlagType)
  flagType: FlagType;

  @ApiProperty({
    description: 'Priority level of the flag',
    enum: PriorityLevel,
  })
  @IsEnum(PriorityLevel)
  priorityLevel: PriorityLevel;

  @ApiProperty({ description: 'Detailed reason for flagging' })
  @IsString()
  flagReason: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO for querying an application (requesting more info)
export class QueryApplicationDto {
  @ApiProperty({ description: 'Application submission ID' })
  @IsUUID()
  submissionId: string;

  @ApiProperty({ description: 'Query message to applicant' })
  @IsString()
  queryMessage: string;

  @ApiPropertyOptional({ description: 'Specific documents or info needed' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredDocuments?: string[];

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO for sending to embassy processing
export class ProcessApplicationDto {
  @ApiProperty({ description: 'Application submission ID' })
  @IsUUID()
  submissionId: string;

  @ApiPropertyOptional({ description: 'Processing notes' })
  @IsOptional()
  @IsString()
  processingNotes?: string;

  @ApiPropertyOptional({ description: 'Priority level' })
  @IsOptional()
  @IsString()
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

// Legacy DTO for backward compatibility (can be removed later)
export class VerificationReviewDto {
  @ApiProperty({ description: 'Application submission ID' })
  @IsUUID()
  submissionId: string;

  @ApiProperty({ description: 'Verification action', enum: VerificationAction })
  @IsEnum(VerificationAction)
  verificationAction: VerificationAction;

  @ApiPropertyOptional({ description: 'Review notes and comments' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

export class ApplicationReviewDto {
  @ApiProperty({
    description: 'Application reference number',
    example: 'MA00125000037'
  })
  referenceNumber: string;

  @ApiProperty({
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  submissionId: string;

  @ApiProperty({
    description: 'Application status',
    example: 'UNDER_REVIEW'
  })
  status: string;

  @ApiProperty({
    description: 'Date submitted',
    example: '2024-01-15T10:30:00.000Z'
  })
  submittedAt: string;

  @ApiProperty({
    description: 'Applicant information',
    example: {
      id: '456e7890-e89b-12d3-a456-426614174001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+2348012345678',
      nin: '12345678901',
      ninVerified: true,
      dateOfBirth: '1990-05-15',
      gender: 'MALE',
      state: 'Lagos',
      lga: 'Ikeja'
    }
  })
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nin: string;
    ninVerified: boolean;
    dateOfBirth: string;
    gender: string;
    state: string;
    lga: string;
  };

  @ApiProperty({
    description: 'Form information',
    example: {
      id: '789e0123-e89b-12d3-a456-426614174002',
      name: 'Tourist Visa Application',
      country: {
        name: 'United States',
        isoCode2: 'US',
        isoCode3: 'USA',
        flag: '🇺🇸',
        logoUrl: 'https://example.com/us-flag.png'
      }
    }
  })
  form: {
    id: string;
    name: string;
    country: {
      name: string;
      isoCode2: string;
      isoCode3: string;
      flag: string;
      logoUrl: string;
    };
  };

  @ApiProperty({
    description:
      'Form field responses organized by sections and groups for easy frontend rendering',
  })
  formResponses: {
    // Hierarchical structure organized by sections
    sections: Array<{
      sectionName: string;
      sectionOrder: number;
      groups: Array<{
        groupName: string;
        groupOrder: number;
        fields: Array<{
          fieldId: string;
          fieldName: string;
          fieldLabel: string;
          fieldType: string;
          value: any; // The actual value entered by the applicant
          fileUrls: string[]; // For file upload fields
          isRequired: boolean;
          displayOrder: number;
          // Frontend-friendly metadata
          isCompleted: boolean; // Whether field has a value
          validationStatus: 'valid' | 'invalid' | 'missing' | 'optional';
          displayValue: string; // Human-readable value for display
        }>;
      }>;
    }>;
    // Summary statistics for quick overview
    summary: {
      totalFields: number;
      completedFields: number;
      requiredFields: number;
      completedRequiredFields: number;
      completionPercentage: number;
      sections: Array<{
        sectionName: string;
        totalFields: number;
        completedFields: number;
        completionPercentage: number;
      }>;
    };
  };

  @ApiProperty({ description: 'NIN verification data' })
  ninVerification: {
    id: string;
    nin: string;
    firstName: string;
    lastName: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber: string;
    photo: string;
    verificationStatus: string;
    verificationDate: string;
    address: {
      line1: string;
      city: string;
      state: string;
      lga: string;
      country: string;
    };
  };

  @ApiProperty({
    description: 'Biometric data summary (detailed fingerprint data available via separate endpoint)',
    example: {
      id: 'abc12345-e89b-12d3-a456-426614174003',
      photoUrl: 'https://storage.example.com/biometric-photos/photo-123.jpg',
      photoQualityScore: 85,
      isVerified: false,
      verificationStatus: 'PENDING',
      capturedAt: '2024-01-15T14:30:00.000Z',
      capturedBy: 'agent-001',
      captureDevice: 'Suprema RealScan-G10',
      fingerprintCount: 10,
      fingerprintQualitySummary: {
        averageQuality: 78,
        acceptableFingers: 8,
        totalFingers: 10
      }
    }
  })
  biometricData: {
    id: string;
    photoUrl: string;
    photoQualityScore: number;
    isVerified: boolean;
    verificationStatus: string;
    capturedAt: string;
    capturedBy: string;
    captureDevice: string;
    fingerprintCount: number; // Number of fingers captured
    fingerprintQualitySummary: {
      averageQuality: number;
      acceptableFingers: number;
      totalFingers: number;
    };
  };

  @ApiPropertyOptional({ description: 'User profile photo' })
  userProfilePhoto?: string;

  @ApiProperty({
    description: 'Appointment information',
    example: {
      id: 'def67890-e89b-12d3-a456-426614174004',
      appointmentDate: '2024-01-16T09:00:00.000Z',
      center: {
        name: 'Lagos Biometric Center',
        address: '123 Victoria Island',
        city: 'Lagos',
        state: 'Lagos'
      },
      status: 'COMPLETED'
    }
  })
  appointment: {
    id: string;
    appointmentDate: string;
    center: {
      name: string;
      address: string;
      city: string;
      state: string;
    };
    status: string;
  };
}

export class VerificationReviewListDto {
  @ApiProperty({ description: 'List of applications for review' })
  applications: ApplicationReviewDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;
}

export class VerificationStatsDto {
  @ApiProperty({ description: 'Total applications pending review' })
  pendingReview: number;

  @ApiProperty({ description: 'Total applications flagged today' })
  flaggedToday: number;

  @ApiProperty({ description: 'Total applications queried today' })
  queriedToday: number;

  @ApiProperty({ description: 'Total applications sent to processing today' })
  processingToday: number;

  @ApiProperty({ description: 'Average verification time in minutes' })
  averageVerificationTime: number;
}
