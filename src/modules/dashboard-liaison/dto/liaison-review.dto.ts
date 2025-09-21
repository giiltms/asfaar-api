import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SubmissionStatus } from '@prisma/client';

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
    appointmentDate: Date;
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

  @ApiProperty({ description: 'Action to take on the application' })
  @IsEnum(['APPROVE', 'REJECT', 'REQUEST_INFO', 'ESCALATE'])
  action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' | 'ESCALATE';

  @ApiProperty({ description: 'Reason for the action' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Required documents for REQUEST_INFO action' })
  @IsOptional()
  requiredDocuments?: string[];
}

export class LiaisonReviewFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by application status' })
  @IsOptional()
  @IsEnum(SubmissionStatus, { each: true })
  status?: SubmissionStatus[];

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  limit?: number;
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
