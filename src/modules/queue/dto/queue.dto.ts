import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AppointmentClass, QueueStatus } from '@prisma/client';
import { PaginationQueryDto } from '@common/dtos/pagination.dto';

export class CheckInDto {
  @ApiProperty({
    description: 'Biometric appointment ID',
    example: 'uuid',
  })
  @IsUUID()
  appointmentId: string;

  @ApiPropertyOptional({
    description: 'Special priority (higher number = higher priority)',
    default: 0,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number = 0;
}

export class UpdateQueueStatusDto {
  @ApiProperty({
    description: 'New queue status',
    enum: QueueStatus,
  })
  @IsEnum(QueueStatus)
  status: QueueStatus;

  @ApiPropertyOptional({
    description: 'Booth ID if assigning to booth',
  })
  @IsOptional()
  @IsUUID()
  boothId?: string;

  @ApiPropertyOptional({
    description: 'Reason for status change',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CallNextDto {
  @ApiProperty({
    description: 'Center ID',
    example: 'uuid',
  })
  @IsUUID()
  centerId: string;

  @ApiProperty({
    description: 'Appointment class',
    enum: AppointmentClass,
  })
  @IsEnum(AppointmentClass)
  appointmentClass: AppointmentClass;

  @ApiPropertyOptional({
    description: 'Specific booth ID to assign',
  })
  @IsOptional()
  @IsUUID()
  boothId?: string;
}

export class QueueFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by center ID',
  })
  @IsOptional()
  @IsUUID()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by appointment class',
    enum: AppointmentClass,
  })
  @IsOptional()
  @IsEnum(AppointmentClass)
  appointmentClass?: AppointmentClass;

  @ApiPropertyOptional({
    description: 'Filter by queue status',
    enum: QueueStatus,
  })
  @IsOptional()
  @IsEnum(QueueStatus)
  status?: QueueStatus;

  @ApiPropertyOptional({
    description: 'Filter by booth ID',
  })
  @IsOptional()
  @IsUUID()
  boothId?: string;

  @ApiPropertyOptional({
    description: 'Filter entries from date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter entries to date (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Only show active queue entries',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  activeOnly?: boolean = true;
}

export class QueuePositionResponseDto {
  @ApiProperty()
  queueId: string;

  @ApiProperty()
  appointmentId: string;

  @ApiProperty()
  queueNumber: number;

  @ApiProperty({ enum: QueueStatus })
  status: QueueStatus;

  @ApiProperty()
  position: number; // Current position in queue

  @ApiProperty()
  estimatedWaitTime: number; // In minutes

  @ApiProperty()
  peopleAhead: number;

  @ApiProperty()
  joinedAt: Date;

  @ApiPropertyOptional()
  calledAt?: Date;

  @ApiProperty()
  centerName: string;

  @ApiProperty({ enum: AppointmentClass })
  appointmentClass: AppointmentClass;
}

export class QueueResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  appointmentId: string;

  @ApiProperty()
  centerId: string;

  @ApiProperty({ enum: AppointmentClass })
  appointmentClass: AppointmentClass;

  @ApiProperty()
  queueNumber: number;

  @ApiProperty({ enum: QueueStatus })
  status: QueueStatus;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  joinedAt: Date;

  @ApiPropertyOptional()
  calledAt?: Date;

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  boothId?: string;

  @ApiPropertyOptional()
  estimatedWaitTime?: number;

  @ApiPropertyOptional()
  estimatedServiceTime?: number;

  @ApiPropertyOptional({
    description: 'Application reference number from form submission',
    example: 'SA25001234',
  })
  referenceNumber?: string;

  // Computed properties
  @ApiProperty()
  statusDisplay: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  canCancel: boolean;

  @ApiProperty()
  waitTimeDisplay: string;
}

export class QueueStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  waiting: number;

  @ApiProperty()
  called: number;

  @ApiProperty()
  inProgress: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty()
  noShow: number;

  @ApiProperty()
  byClass: {
    [AppointmentClass.REGULAR]: {
      waiting: number;
      avgWaitTime: number;
      totalToday: number;
    };
    [AppointmentClass.VIP]: {
      waiting: number;
      avgWaitTime: number;
      totalToday: number;
    };
    [AppointmentClass.PREMIUM]: {
      waiting: number;
      avgWaitTime: number;
      totalToday: number;
    };
  };

  @ApiProperty()
  avgProcessingTime: number; // In minutes

  @ApiProperty()
  avgWaitTime: number; // In minutes

  @ApiProperty()
  peakHour: string; // e.g., "14:00"

  @ApiProperty()
  efficiency: number; // Percentage (completed / total scheduled)
}

export class BulkUpdateQueueDto {
  @ApiProperty({
    description: 'Queue entry IDs to update',
    type: [String],
  })
  @IsUUID('4', { each: true })
  queueIds: string[];

  @ApiProperty({
    description: 'New status for all entries',
    enum: QueueStatus,
  })
  @IsEnum(QueueStatus)
  status: QueueStatus;

  @ApiPropertyOptional({
    description: 'Reason for bulk update',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
