import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { AppointmentStatus, QueueStatus } from '@prisma/client';

export class CheckInAppointmentDto {
  @ApiPropertyOptional({
    description: 'Notes from gatehouse staff',
    example: 'Applicant arrived on time with all documents',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddToQueueDto {
  @ApiPropertyOptional({
    description:
      'Priority level for this applicant (higher number = higher priority)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Estimated wait time in minutes',
    example: 15,
  })
  @IsOptional()
  estimatedWaitTime?: number;

  @ApiPropertyOptional({
    description: 'Estimated service time in minutes',
    example: 30,
  })
  @IsOptional()
  estimatedServiceTime?: number;

  @ApiPropertyOptional({
    description: 'Notes from receptionist',
    example: 'VIP applicant, expedite processing',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateQueueStatusDto {
  @ApiProperty({
    description: 'New queue status',
    enum: QueueStatus,
    example: 'CALLED',
  })
  @IsEnum(QueueStatus)
  status: QueueStatus;

  @ApiPropertyOptional({
    description: 'Booth ID to assign (required when status is CALLED)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  boothId?: string;

  @ApiPropertyOptional({
    description: 'Notes about the status change',
    example: 'Applicant called to booth A1',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckInResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Applicant successfully checked in',
  })
  message: string;

  @ApiProperty({
    description: 'Updated appointment data',
    type: 'object',
  })
  data: {
    appointmentId: string;
    status: AppointmentStatus;
    checkedIn: boolean;
    checkedInAt: Date;
    checkedInBy: string;
  };
}

export class QueueResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Applicant successfully added to queue',
  })
  message: string;

  @ApiProperty({
    description: 'Queue entry data',
    type: 'object',
  })
  data: {
    queueEntryId: string;
    queueNumber: number;
    status: QueueStatus;
    estimatedWaitTime?: number;
    estimatedServiceTime?: number;
  };
}

export class AssignBoothDto {
  @ApiProperty({
    description: 'Booth ID to assign to the applicant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  boothId: string;
}

export class StatusUpdateResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Queue status updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated queue entry data',
    type: 'object',
  })
  data: {
    queueEntryId: string;
    status: QueueStatus;
    boothId?: string;
    updatedAt: Date;
  };
}
