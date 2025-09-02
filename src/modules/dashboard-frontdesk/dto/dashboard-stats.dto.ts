import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QueueStatsDto {
  @ApiProperty({
    description: 'Number of applications waiting in queue',
    example: 42,
    minimum: 0,
  })
  waitingQueue: number;

  @ApiProperty({
    description: 'Number of applications currently being processed',
    example: 18,
    minimum: 0,
  })
  inProgress: number;

  @ApiProperty({
    description: 'Total applications in queue (waiting + in progress)',
    example: 60,
    minimum: 0,
  })
  totalInQueue: number;
}

export class StationStatsDto {
  @ApiProperty({
    description: 'Number of stations currently available',
    example: 7,
    minimum: 0,
  })
  availableStations: number;

  @ApiProperty({
    description: 'Number of stations currently occupied',
    example: 5,
    minimum: 0,
  })
  busyStations: number;

  @ApiProperty({
    description: 'Total number of stations',
    example: 12,
    minimum: 0,
  })
  totalStations: number;

  @ApiProperty({
    description: 'Station utilization percentage',
    example: 41.67,
    minimum: 0,
    maximum: 100,
  })
  utilizationPercentage: number;
}

export class ApplicationStatsDto {
  @ApiProperty({
    description: 'Number of new applications received today',
    example: 24,
    minimum: 0,
  })
  todayApplications: number;

  @ApiProperty({
    description: 'Number of applications completed today',
    example: 15,
    minimum: 0,
  })
  completedToday: number;

  @ApiProperty({
    description: 'Number of applications pending from previous days',
    example: 38,
    minimum: 0,
  })
  pendingFromPreviousDays: number;

  @ApiProperty({
    description: 'Total applications in system',
    example: 80,
    minimum: 0,
  })
  totalApplications: number;
}

export class ProcessingStatsDto {
  @ApiProperty({
    description: 'Average processing time in minutes',
    example: 8.5,
    minimum: 0,
  })
  avgProcessingTime: number;

  @ApiProperty({
    description: 'Fastest processing time today in minutes',
    example: 3.2,
    minimum: 0,
  })
  fastestProcessingToday: number;

  @ApiProperty({
    description: 'Slowest processing time today in minutes',
    example: 15.8,
    minimum: 0,
  })
  slowestProcessingToday: number;

  @ApiProperty({
    description: 'Total processing time today in minutes',
    example: 127.5,
    minimum: 0,
  })
  totalProcessingTimeToday: number;
}

export class AgentStatsDto {
  @ApiProperty({
    description: 'Number of active agents today',
    example: 12,
    minimum: 0,
  })
  activeAgents: number;

  @ApiProperty({
    description: 'Number of agents on break',
    example: 3,
    minimum: 0,
  })
  agentsOnBreak: number;

  @ApiProperty({
    description: 'Number of agents off duty',
    example: 2,
    minimum: 0,
  })
  agentsOffDuty: number;

  @ApiProperty({
    description: 'Total agents assigned to this station',
    example: 17,
    minimum: 0,
  })
  totalAgents: number;
}

export class FrontDeskDashboardStatsDto {
  @ApiProperty({
    description: 'Queue statistics',
    type: QueueStatsDto,
  })
  queueStats: QueueStatsDto;

  @ApiProperty({
    description: 'Station statistics',
    type: StationStatsDto,
  })
  stationStats: StationStatsDto;

  @ApiProperty({
    description: 'Application statistics',
    type: ApplicationStatsDto,
  })
  applicationStats: ApplicationStatsDto;

  @ApiProperty({
    description: 'Processing time statistics',
    type: ProcessingStatsDto,
  })
  processingStats: ProcessingStatsDto;

  @ApiProperty({
    description: 'Agent statistics',
    type: AgentStatsDto,
  })
  agentStats: AgentStatsDto;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2025-08-27T21:41:00Z',
  })
  lastUpdated: string;

  @ApiProperty({
    description: 'Station ID for this dashboard (null for multi-center view)',
    example: 'station-uuid-123',
    required: false,
  })
  stationId?: string | null;

  @ApiProperty({
    description: 'Station name or center summary',
    example: 'Main Reception',
  })
  stationName: string;

  @ApiProperty({
    description: 'User assigned centers',
    type: [Object],
    required: false,
  })
  userCenters?: any[];
}

export class DashboardStatsResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Dashboard statistics data',
    type: FrontDeskDashboardStatsDto,
  })
  data: FrontDeskDashboardStatsDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Dashboard statistics retrieved successfully',
  })
  message: string;
}

// Applicant listing DTOs
export class ApplicantListItemDto {
  @ApiProperty({
    description: 'Applicant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Applicant full name',
    example: 'John Doe',
  })
  fullName: string;

  @ApiProperty({
    description: 'Applicant email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Applicant phone number',
    example: '+2348012345678',
  })
  phone: string;

  @ApiProperty({
    description: 'Application status',
    example: 'PENDING',
    enum: ['DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  })
  status: string;

  @ApiProperty({
    description: 'Application type',
    example: 'VISA_APPLICATION',
  })
  applicationType: string;

  @ApiProperty({
    description: 'Submission date',
    example: '2025-08-29T10:30:00Z',
  })
  submittedAt: Date;

  @ApiProperty({
    description: 'Queue position (if in queue)',
    example: 5,
    required: false,
  })
  queuePosition?: number;

  @ApiProperty({
    description: 'Estimated wait time in minutes',
    example: 15,
    required: false,
  })
  estimatedWaitTime?: number;

  @ApiProperty({
    description: 'Current station/booth assignment',
    example: 'Booth A1',
    required: false,
  })
  currentStation?: string;

  @ApiProperty({
    description: 'Check-in status by gatehouse',
    example: 'CHECKED_IN',
    enum: ['NOT_ARRIVED', 'CHECKED_IN', 'IN_QUEUE', 'AT_BOOTH', 'COMPLETED'],
  })
  checkInStatus: string;

  @ApiProperty({
    description: 'Time when applicant was checked in',
    example: '2025-08-29T10:30:00Z',
    required: false,
  })
  checkedInAt?: Date;

  @ApiProperty({
    description: 'Queue status (if added to queue)',
    example: 'WAITING',
    enum: ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED'],
    required: false,
  })
  queueStatus?: string;

  @ApiProperty({
    description: 'Whether applicant is in queue',
    example: true,
  })
  isInQueue: boolean;

  @ApiProperty({
    description: 'Payment status',
    example: 'PAID',
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
  })
  paymentStatus: string;
}

export class ApplicantListFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by application status',
    example: 'PENDING',
    enum: ['DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by application type',
    example: 'VISA_APPLICATION',
  })
  @IsOptional()
  @IsString()
  applicationType?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment status',
    example: 'PAID',
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
  })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({
    description: 'Search by applicant name or email',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by submission date (from)',
    example: '2025-08-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by submission date (to)',
    example: '2025-08-29',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by check-in status',
    example: 'CHECKED_IN',
    enum: ['NOT_ARRIVED', 'CHECKED_IN', 'IN_QUEUE', 'AT_BOOTH', 'COMPLETED'],
  })
  @IsOptional()
  @IsString()
  checkInStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by queue status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  inQueue?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ApplicantListResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'List of applicants',
    type: [ApplicantListItemDto],
  })
  data: ApplicantListItemDto[];

  @ApiProperty({
    description: 'Pagination information',
    example: {
      page: 1,
      limit: 20,
      total: 150,
      totalPages: 8,
      hasNext: true,
      hasPrev: false,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({
    description: 'Response message',
    example: 'Applicants retrieved successfully',
  })
  message: string;
}

export class ApplicantDetailDto extends ApplicantListItemDto {
  @ApiProperty({
    description: 'Applicant NIN (National Identity Number)',
    example: '12345678901',
    required: false,
  })
  nin?: string;

  @ApiProperty({
    description: 'Applicant date of birth',
    example: '1990-01-01',
  })
  dateOfBirth: Date;

  @ApiProperty({
    description: 'Applicant nationality',
    example: 'Nigerian',
  })
  nationality: string;

  @ApiProperty({
    description: 'Applicant address',
    example: '123 Main Street, Lagos, Nigeria',
  })
  address: string;

  @ApiProperty({
    description: 'Application form data',
    example: {
      personalInfo: { firstName: 'John', lastName: 'Doe' },
      travelInfo: { destination: 'UK', purpose: 'Tourism' },
    },
  })
  formData: any;

  @ApiProperty({
    description: 'Biometric appointment details',
    example: {
      appointmentDate: '2025-08-30T10:00:00Z',
      status: 'SCHEDULED',
      centerName: 'Main Biometric Center',
    },
    required: false,
  })
  biometricAppointment?: any;

  @ApiProperty({
    description: 'Payment details',
    example: {
      amount: 50000,
      currency: 'NGN',
      paymentMethod: 'CARD',
      transactionId: 'TXN123456',
    },
  })
  paymentDetails: any;

  @ApiProperty({
    description: 'Processing timeline',
    example: [
      { step: 'SUBMITTED', timestamp: '2025-08-29T10:30:00Z' },
      { step: 'PAYMENT_CONFIRMED', timestamp: '2025-08-29T10:35:00Z' },
      { step: 'IN_QUEUE', timestamp: '2025-08-29T10:40:00Z' },
    ],
  })
  timeline: Array<{
    step: string;
    timestamp: Date;
    description?: string;
  }>;
}
