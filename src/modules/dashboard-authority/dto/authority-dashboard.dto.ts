import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { SubmissionStatus } from '@prisma/client';

// DTO for application list filters
export class AuthorityApplicationFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by application status' })
  @IsOptional()
  @IsEnum(SubmissionStatus, { each: true })
  status?: SubmissionStatus[];

  @ApiPropertyOptional({ description: 'Filter by country ID' })
  @IsOptional()
  @IsUUID()
  countryId?: string;

  @ApiPropertyOptional({ description: 'Filter by form type/visa type' })
  @IsOptional()
  @IsString()
  formType?: string;

  @ApiPropertyOptional({ description: 'Filter by date range - start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by date range - end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Search by reference number or applicant name' })
  @IsOptional()
  @IsString()
  search?: string;
}

// DTO for application list query parameters
export class AuthorityApplicationQueryDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'submittedAt';

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// DTO for application summary
export class AuthorityApplicationDto {
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
    nin: string;
    country: string;
  };

  @ApiProperty({ description: 'Form/visa information' })
  form: {
    id: string;
    name: string;
    country: {
      name: string;
      isoCode2: string;
      isoCode3: string;
    };
  };

  @ApiProperty({ description: 'Payment information' })
  payment: {
    amount: number;
    currency: string;
    status: string;
  };

  @ApiProperty({ description: 'Appointment information' })
  appointment: {
    appointmentTime: string;
    center: string;
    status: string;
  } | null;

  @ApiProperty({ description: 'Biometric capture status' })
  biometrics: {
    captured: boolean;
    capturedAt: string | null;
    verified: boolean;
  };
}

// DTO for application list response
export class AuthorityApplicationListDto {
  @ApiProperty({ description: 'List of applications' })
  applications: AuthorityApplicationDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;
}

// DTO for analytics stats
export class AuthorityStatsDto {
  @ApiProperty({ description: 'Total applications in system' })
  totalApplications: number;

  @ApiProperty({ description: 'Applications by status' })
  applicationsByStatus: Record<string, number>;

  @ApiProperty({ description: 'Applications by country' })
  applicationsByCountry: Array<{
    country: string;
    countryCode: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Applications by visa type' })
  applicationsByVisaType: Array<{
    visaType: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Applications by year' })
  applicationsByYear: Array<{
    year: number;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Applications by month (current year)' })
  applicationsByMonth: Array<{
    month: string;
    monthNumber: number;
    count: number;
  }>;

  @ApiProperty({ description: 'Revenue statistics' })
  revenue: {
    totalRevenue: number;
    currency: string;
    averageApplicationValue: number;
    revenueByCountry: Array<{
      country: string;
      countryCode: string;
      revenue: number;
      percentage: number;
    }>;
  };

  @ApiProperty({ description: 'Processing statistics' })
  processing: {
    averageProcessingTime: number; // in days
    completionRate: number; // percentage
    rejectionRate: number; // percentage
  };
}

// DTO for detailed application view
export class AuthorityApplicationDetailDto extends AuthorityApplicationDto {
  @ApiProperty({ description: 'Form responses' })
  formResponses: any;

  @ApiProperty({ description: 'NIN verification data' })
  ninVerification: any;

  @ApiProperty({ description: 'Biometric data summary' })
  biometricData: any;

  @ApiProperty({ description: 'Status history' })
  statusHistory: Array<{
    fromStatus: string;
    toStatus: string;
    changedAt: string;
    changedBy: string;
    reason: string;
    notes: string;
  }>;

  @ApiProperty({ description: 'Flags and queries' })
  flags: Array<{
    flagType: string;
    priority: string;
    reason: string;
    status: string;
    createdAt: string;
    createdBy: string;
  }>;

  @ApiProperty({ description: 'Queries' })
  queries: Array<{
    queryMessage: string;
    requiredDocuments: string[];
    queriedAt: string;
    queriedBy: string;
  }>;
}
