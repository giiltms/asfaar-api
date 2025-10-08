import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SubmissionStatus } from '@prisma/client';

// Liaison officer action enum
export enum LiaisonAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_INFO = 'REQUEST_INFO',
  ESCALATE = 'ESCALATE',
}

// Liaison officer action reason enum
export enum LiaisonActionReason {
  // For APPROVE
  DOCUMENTS_VERIFIED = 'DOCUMENTS_VERIFIED',
  INFORMATION_COMPLETE = 'INFORMATION_COMPLETE',
  NO_ISSUES_FOUND = 'NO_ISSUES_FOUND',

  // For REJECT
  INSUFFICIENT_DOCUMENTATION = 'INSUFFICIENT_DOCUMENTATION',
  FRAUDULENT_INFORMATION = 'FRAUDULENT_INFORMATION',
  SECURITY_CONCERNS = 'SECURITY_CONCERNS',

  // For REQUEST_INFO
  MISSING_DOCUMENTS = 'MISSING_DOCUMENTS',
  CLARIFICATION_NEEDED = 'CLARIFICATION_NEEDED',
  ADDITIONAL_VERIFICATION = 'ADDITIONAL_VERIFICATION',

  // For ESCALATE
  COMPLEX_CASE = 'COMPLEX_CASE',
  REQUIRES_HIGHER_AUTHORITY = 'REQUIRES_HIGHER_AUTHORITY',
  TECHNICAL_ISSUES = 'TECHNICAL_ISSUES',
}

// Reuse the existing DTOs from verification dashboard
export { ApplicationReviewDto } from '@modules/dashboard-verification/dto/verification-review.dto';

// Create simplified DTOs for liaison officer
export class LiaisonApplicationDto {
  @ApiProperty({ description: 'Application ID' })
  id: string;

  @ApiProperty({ description: 'Reference number' })
  referenceNumber: string;

  @ApiProperty({ description: 'Application status' })
  status: SubmissionStatus;

  @ApiProperty({ description: 'Submission date' })
  submittedAt: Date;

  @ApiProperty({ description: 'Review date' })
  reviewedAt: Date;

  @ApiProperty({ description: 'Reviewed by' })
  reviewedBy: string;

  @ApiProperty({ description: 'Review notes' })
  reviewNotes: string;

  @ApiProperty({ description: 'Is flagged' })
  isFlagged: boolean;

  @ApiProperty({ description: 'Flag reason' })
  flagReason: string;

  @ApiProperty({ description: 'Flagged at' })
  flaggedAt: Date;

  @ApiProperty({ description: 'Applicant information' })
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({ description: 'Form information' })
  form: {
    name: string;
    country: string;
  };

  @ApiProperty({ description: 'Appointment information' })
  appointment: {
    appointmentTime: Date;
    status: string;
    center: string;
  } | null;

  @ApiProperty({ description: 'Payment information' })
  payment: {
    amount: number;
    status: string;
    currency: string;
  } | null;
}

export class LiaisonReviewListDto {
  @ApiProperty({ description: 'List of applications for review' })
  applications: LiaisonApplicationDto[];

  @ApiProperty({ description: 'Pagination information' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class LiaisonStatsDto {
  @ApiProperty({ description: 'Total applications pending review' })
  pendingReview: number;

  @ApiProperty({ description: 'Total flagged applications' })
  flaggedApplications: number;

  @ApiProperty({ description: 'Total queried applications' })
  queriedApplications: number;

  @ApiProperty({ description: 'Total processed applications' })
  processedApplications: number;

  @ApiProperty({ description: 'Total applications' })
  totalApplications: number;
}

// Liaison officer specific DTOs
export class LiaisonActionDto {
  @ApiProperty({ description: 'Application submission ID' })
  @IsUUID()
  submissionId: string;

  @ApiProperty({
    description: 'Action to take on the application',
    enum: LiaisonAction,
  })
  @IsEnum(LiaisonAction)
  action: LiaisonAction;

  @ApiProperty({
    description: 'Reason for the action',
    enum: LiaisonActionReason,
  })
  @IsEnum(LiaisonActionReason)
  reason: LiaisonActionReason;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Required documents for REQUEST_INFO action',
  })
  @IsOptional()
  requiredDocuments?: string[];
}

export class LiaisonReviewFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by application status' })
  @IsOptional()
  @IsEnum(SubmissionStatus, { each: true })
  status?: SubmissionStatus[];

  @ApiPropertyOptional({ description: 'Page number' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  limit?: number = 10;
}

export class LiaisonActionResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'New application status' })
  newStatus: SubmissionStatus;

  @ApiProperty({ description: 'Action taken' })
  action: string;

  @ApiProperty({ description: 'Timestamp of action' })
  timestamp: string;
}
