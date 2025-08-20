import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';

// New enums for correct verification officer actions
export enum VerificationAction {
  FLAGGED = 'FLAGGED',
  QUERIED = 'QUERIED',
  PROCESSING = 'PROCESSING',
}

export enum SecurityDepartment {
  SECURITY_OFFICER = 'SECURITY_OFFICER',
  EMBASSY_OFFICER = 'EMBASSY_OFFICER',
  ASFAAR_ADMIN = 'ASFAAR_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
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

  @ApiProperty({ description: 'Reason for flagging' })
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
  @IsString()
  requiredDocuments?: string;

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
  @ApiProperty({ description: 'Application reference number' })
  referenceNumber: string;

  @ApiProperty({ description: 'Submission ID' })
  submissionId: string;

  @ApiProperty({ description: 'Application status' })
  status: string;

  @ApiProperty({ description: 'Date submitted' })
  submittedAt: string;

  @ApiProperty({ description: 'Applicant information' })
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nin: string;
    dateOfBirth: string;
    gender: string;
    state: string;
    lga: string;
  };

  @ApiProperty({ description: 'Form information' })
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

  @ApiProperty({ description: 'Biometric data' })
  biometricData: {
    id: string;
    photoUrl: string;
    photoQualityScore: number;
    fingerprintQualityScore: number;
    overallQualityScore: number;
    isVerified: boolean;
    verificationStatus: string;
    capturedAt: string;
    capturedBy: string;
    captureDevice: string;
    fingerprintFingers: Array<{
      fingerPosition: string;
      fingerName: string;
      qualityScore: number;
      isAcceptable: boolean;
      capturedAt: string;
    }>;
  };

  @ApiProperty({ description: 'User profile photo' })
  userProfilePhoto: string;

  @ApiProperty({ description: 'Appointment information' })
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
