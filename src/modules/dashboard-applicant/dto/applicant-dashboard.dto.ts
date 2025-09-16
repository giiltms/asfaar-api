import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import {
  SubmissionStatus,
  AppointmentStatus,
  PaymentStatus,
  QueueStatus,
} from '@prisma/client';

export class ApplicationStatsDto {
  @ApiProperty({
    description: 'Total number of applications',
    example: 5,
  })
  totalApplications: number;

  @ApiProperty({
    description: 'Number of draft applications',
    example: 1,
  })
  draftApplications: number;

  @ApiProperty({
    description: 'Number of submitted applications',
    example: 2,
  })
  submittedApplications: number;

  @ApiProperty({
    description: 'Number of applications under review',
    example: 1,
  })
  inReviewApplications: number;

  @ApiProperty({
    description: 'Number of approved applications',
    example: 1,
  })
  approvedApplications: number;

  @ApiProperty({
    description: 'Number of rejected applications',
    example: 0,
  })
  rejectedApplications: number;

  @ApiProperty({
    description: 'Applications with active appointments',
    example: 2,
  })
  withAppointments: number;

  @ApiProperty({
    description: 'Applications with completed payments',
    example: 2,
  })
  withPayments: number;

  @ApiProperty({
    description: 'Applications currently in queue',
    example: 1,
  })
  inQueue: number;

  @ApiProperty({
    description: 'Applications with completed biometric capture',
    example: 1,
  })
  biometricCompleted: number;

  @ApiProperty({
    description: 'Percentage completion rate',
    example: 80.0,
  })
  completionRate: number;
}

export class ApplicationStageDto {
  @ApiProperty({
    description: 'Stage name',
    example: 'Application Submitted',
  })
  stageName: string;

  @ApiProperty({
    description: 'Stage status',
    example: 'COMPLETED',
  })
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';

  @ApiProperty({
    description: 'Stage timestamp',
    example: '2025-01-15T10:30:00Z',
  })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Additional notes or details',
    example: 'All required documents uploaded',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Staff member who processed this stage',
    example: 'John Admin',
  })
  processedBy?: string;
}

export class ApplicationTimelineDto {
  @ApiProperty({
    description: 'Application submission ID',
    example: 'uuid',
  })
  submissionId: string;

  @ApiProperty({
    description: 'Form name',
    example: 'Nigeria Visa Application',
  })
  formName: string;

  @ApiProperty({
    description: 'Current status',
    enum: SubmissionStatus,
    example: SubmissionStatus.APPROVED,
  })
  currentStatus: SubmissionStatus;

  @ApiProperty({
    description: 'Application stages with timestamps',
    type: [ApplicationStageDto],
  })
  stages: ApplicationStageDto[];

  @ApiProperty({
    description: 'Estimated completion date',
    example: '2025-02-15T00:00:00Z',
  })
  estimatedCompletion?: Date;

  @ApiProperty({
    description: 'Days since submission',
    example: 7,
  })
  daysSinceSubmission: number;

  @ApiProperty({
    description: 'Next action required',
    example: 'Attend biometric appointment',
  })
  nextAction?: string;

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 75,
  })
  progressPercentage: number;
}

export class QuickApplicationDto {
  @ApiProperty({
    description: 'Application submission ID',
    example: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Application reference number',
    example: 'MA00225000005',
  })
  referenceNumber: string;

  @ApiProperty({
    description: 'Form name',
    example: 'Nigeria Visa Application',
  })
  formName: string;

  @ApiProperty({
    description: 'Application status',
    enum: SubmissionStatus,
  })
  status: SubmissionStatus;

  @ApiProperty({
    description: 'Application submission date',
    example: '2025-01-15T10:30:00Z',
  })
  submittedAt?: Date;

  @ApiProperty({
    description: 'Last updated date',
    example: '2025-01-20T14:15:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Progress percentage',
    example: 60,
  })
  progressPercentage: number;

  @ApiProperty({
    description: 'Next action required',
    example: 'Complete payment',
  })
  nextAction?: string;

  @ApiPropertyOptional({
    description: 'Appointment details if scheduled',
  })
  appointment?: {
    id: string;
    appointmentDate: Date;
    appointmentTime: Date;
    status: AppointmentStatus;
    centerName: string;
  };

  @ApiPropertyOptional({
    description: 'Payment details if exists',
  })
  payment?: {
    id: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    paidAt?: Date;
  };

  @ApiPropertyOptional({
    description: 'Queue details if in queue',
  })
  queue?: {
    id: string;
    queueNumber: number;
    status: QueueStatus;
    position: number;
    estimatedWaitTime: number;
  };
}

export class ApplicantDashboardDto {
  @ApiProperty({
    description: 'Application statistics summary',
    type: ApplicationStatsDto,
  })
  stats: ApplicationStatsDto;

  @ApiProperty({
    description: 'Recent applications overview',
    type: [QuickApplicationDto],
  })
  recentApplications: QuickApplicationDto[];

  @ApiProperty({
    description: 'Applications requiring action',
    type: [QuickApplicationDto],
  })
  actionRequired: QuickApplicationDto[];

  @ApiProperty({
    description: 'Upcoming appointments',
    type: [QuickApplicationDto],
  })
  upcomingAppointments: QuickApplicationDto[];
}

export class DashboardFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter from date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter to date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: SubmissionStatus,
  })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @ApiPropertyOptional({
    description: 'Filter by form ID',
  })
  @IsOptional()
  @IsUUID()
  formId?: string;
}

// Application Log DTOs
export class ApplicationTimelineEventDto {
  @ApiProperty({
    description: 'Timeline event type',
    enum: [
      'APPLICATION_CREATED',
      'PAYMENT_PROCESSED',
      'BIOMETRIC_SCHEDULED',
      'BIOMETRIC_COMPLETED',
      'APPLICATION_PROCESSING',
      'DECISION_MADE',
    ],
  })
  type: string;

  @ApiProperty({
    description: 'Event title',
    example: 'Application Created',
  })
  title: string;

  @ApiProperty({
    description: 'Event description',
    example: 'Your application has been created',
  })
  description: string;

  @ApiProperty({
    description: 'Event date',
    example: '2025-07-29T00:00:00.000Z',
  })
  date: string;

  @ApiProperty({
    description: 'Whether this event is completed',
    example: true,
  })
  completed: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for the event',
    example: { appointmentDate: '2025-08-04T10:00:00.000Z' },
  })
  metadata?: Record<string, any>;
}

export class ApplicationLogDto {
  @ApiProperty({
    description: 'Application reference number',
    example: 'SA2025560692',
  })
  referenceNumber: string;

  @ApiProperty({
    description: 'Application type',
    example: 'umrah',
  })
  applicationType: string;

  @ApiProperty({
    description: 'Destination country',
    example: 'Saudi Arabia',
  })
  country: string;

  @ApiProperty({
    description: 'Current application status',
    enum: SubmissionStatus,
    example: SubmissionStatus.SUBMITTED,
  })
  status: SubmissionStatus;

  @ApiProperty({
    description: 'Application timeline events',
    type: [ApplicationTimelineEventDto],
  })
  timeline: ApplicationTimelineEventDto[];

  @ApiProperty({
    description: 'When the application was created',
    example: '2025-07-29T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last updated date',
    example: '2025-08-04T00:00:00.000Z',
  })
  updatedAt: string;
}

export class ApplicationLogListDto {
  @ApiProperty({
    description: 'List of application logs',
    type: [ApplicationLogDto],
  })
  applications: ApplicationLogDto[];

  @ApiProperty({
    description: 'Total number of applications',
    example: 3,
  })
  total: number;
}
