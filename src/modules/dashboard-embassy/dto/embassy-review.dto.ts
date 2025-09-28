import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SubmissionStatus } from '@prisma/client';

// Reuse the existing DTOs from verification dashboard
export { ApplicationReviewDto } from '@modules/dashboard-verification/dto/verification-review.dto';

// Create simplified DTOs for embassy officer
export class EmbassyApplicationDto {
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

  @ApiProperty({ description: 'Priority level' })
  priority: string;

  @ApiProperty({ description: 'Processing notes' })
  processingNotes: string;
}

export class EmbassyReviewListDto {
  @ApiProperty({ description: 'List of applications for review' })
  applications: EmbassyApplicationDto[];

  @ApiProperty({ description: 'Pagination information' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class EmbassyStatsDto {
  @ApiProperty({ description: 'Total applications for this country' })
  totalApplications: number;

  @ApiProperty({ description: 'Applications pending embassy review' })
  pendingReview: number;

  @ApiProperty({ description: 'Applications currently being processed' })
  processingApplications: number;

  @ApiProperty({ description: 'Applications approved by embassy' })
  approvedApplications: number;

  @ApiProperty({ description: 'Applications rejected by embassy' })
  rejectedApplications: number;

  @ApiProperty({ description: 'Applications queried by embassy' })
  queriedApplications: number;


  @ApiProperty({ description: 'Average processing time in days' })
  averageProcessingTime: number;
}

// Embassy officer specific DTOs
export class EmbassyActionDto {
  @ApiProperty({ description: 'Application submission ID' })
  @IsUUID()
  submissionId: string;

  @ApiProperty({
    description: 'Final action to take on the application',
    enum: ['APPROVE', 'REJECT', 'REQUEST_INFO']
  })
  @IsEnum(['APPROVE', 'REJECT', 'REQUEST_INFO'])
  action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';

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

export class EmbassyReviewFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by application status' })
  @IsOptional()
  @IsEnum(SubmissionStatus, { each: true })
  status?: SubmissionStatus[];

  @ApiPropertyOptional({ description: 'Filter by priority level' })
  @IsOptional()
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Search by applicant name or reference number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by submission date from' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by submission date to' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  limit?: number;
}

export class EmbassyActionResponseDto {
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

  @ApiProperty({ description: 'Email notification sent' })
  emailSent: boolean;
}
