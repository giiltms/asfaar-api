import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsDateString,
  IsDate,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AppointmentClass, AppointmentStatus } from '@prisma/client';
import { PaginationQueryDto } from '@common/dtos/pagination.dto';

// Base DTO for creating a biometric appointment
export class CreateBiometricAppointmentDto {
  @ApiProperty({
    description: 'Form submission ID that this appointment is for',
    example: 'uuid-string',
  })
  @IsNotEmpty()
  @IsUUID()
  submissionId: string;

  @ApiProperty({
    description: 'Biometric center ID where appointment will take place',
    example: 'uuid-string',
  })
  @IsNotEmpty()
  @IsUUID()
  centerId: string;

  @ApiPropertyOptional({
    description: 'Appointment class/tier',
    example: 'REGULAR',
    enum: AppointmentClass,
    default: AppointmentClass.REGULAR,
  })
  @IsOptional()
  @IsEnum(AppointmentClass)
  appointmentClass?: AppointmentClass;

  @ApiProperty({
    description: 'Preferred appointment date (YYYY-MM-DD)',
    example: '2024-02-15',
  })
  @IsNotEmpty()
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({
    description: 'Preferred appointment time (ISO string)',
    example: '2024-02-15T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  appointmentTime: string;

  @ApiPropertyOptional({
    description: 'Special requirements or accessibility needs',
    example: 'Wheelchair access needed',
  })
  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @ApiProperty({
    description: 'User confirms the appointment details',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  confirmationAcknowledged: boolean;

  @ApiProperty({
    description: 'User gives consent for biometric capture',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  consentAcknowledged: boolean;

  @ApiProperty({
    description: 'User agrees to terms and conditions',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  termsAcknowledged: boolean;
}

// DTO for updating appointment status (admin use)
export class UpdateAppointmentStatusDto {
  @ApiProperty({
    description: 'Appointment status',
    example: 'ACTIVE',
    enum: AppointmentStatus,
  })
  @IsNotEmpty()
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Admin notes about the status change',
    example: 'Payment confirmed, appointment activated',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

// DTO for rescheduling an appointment
export class RescheduleAppointmentDto {
  @ApiProperty({
    description: 'New appointment date (YYYY-MM-DD)',
    example: '2024-02-20',
  })
  @IsNotEmpty()
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({
    description: 'New appointment time (ISO string)',
    example: '2024-02-20T14:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  appointmentTime: string;

  @ApiProperty({
    description: 'Reason for rescheduling',
    example: 'Unable to attend due to medical emergency',
  })
  @IsNotEmpty()
  @IsString()
  rescheduleReason: string;

  @ApiPropertyOptional({
    description: 'New biometric center ID (if changing location)',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  centerId?: string;
}

// DTO for completing biometric capture
export class CompleteBiometricCaptureDto {
  @ApiProperty({
    description: 'Quality assessment of captured biometrics',
    example: 'Excellent - All biometrics captured successfully',
  })
  @IsNotEmpty()
  @IsString()
  captureQuality: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the capture process',
    example: 'Patient was cooperative, all procedures completed without issues',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

// DTO for filtering appointments
export class AppointmentFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by appointment status',
    example: 'ACTIVE',
    enum: AppointmentStatus,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Filter by appointment class',
    example: 'REGULAR',
    enum: AppointmentClass,
  })
  @IsOptional()
  @IsEnum(AppointmentClass)
  appointmentClass?: AppointmentClass;

  @ApiPropertyOptional({
    description: 'Filter by biometric center ID',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by submission ID',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

  @ApiPropertyOptional({
    description: 'Filter appointments from this date (YYYY-MM-DD)',
    example: '2024-02-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter appointments to this date (YYYY-MM-DD)',
    example: '2024-02-28',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by whether biometrics are captured',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  biometricsCaptured?: boolean;
}

// Combined DTO for appointments query with pagination and filters
export class AppointmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by appointment status',
    example: 'ACTIVE',
    enum: AppointmentStatus,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Filter by appointment class',
    example: 'REGULAR',
    enum: AppointmentClass,
  })
  @IsOptional()
  @IsEnum(AppointmentClass)
  appointmentClass?: AppointmentClass;

  @ApiPropertyOptional({
    description: 'Filter by biometric center ID',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by submission ID',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

  @ApiPropertyOptional({
    description: 'Filter appointments from this date (YYYY-MM-DD)',
    example: '2024-02-01',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filter appointments to this date (YYYY-MM-DD)',
    example: '2024-02-28',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by whether biometrics are captured',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  biometricsCaptured?: boolean;
}

// DTO for updating appointment details
export class UpdateAppointmentDto extends PartialType(
  CreateBiometricAppointmentDto,
) {
  @ApiPropertyOptional({
    description: 'Admin notes',
    example: 'Updated due to center unavailability',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

// Response DTO for appointment
export class AppointmentResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Form submission ID' })
  submissionId: string;

  @ApiProperty({ description: 'Biometric center ID' })
  centerId: string;

  @ApiProperty({ description: 'Appointment class', enum: AppointmentClass })
  appointmentClass: AppointmentClass;

  @ApiProperty({ description: 'Appointment status', enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Appointment date' })
  appointmentDate?: Date;

  @ApiPropertyOptional({ description: 'Appointment time' })
  appointmentTime?: Date;

  @ApiPropertyOptional({ description: 'Special requirements' })
  specialRequirements?: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  adminNotes?: string;

  @ApiProperty({ description: 'Confirmation acknowledged' })
  confirmationAcknowledged: boolean;

  @ApiProperty({ description: 'Consent acknowledged' })
  consentAcknowledged: boolean;

  @ApiProperty({ description: 'Terms acknowledged' })
  termsAcknowledged: boolean;

  @ApiProperty({ description: 'Reminder sent status' })
  reminderSent: boolean;

  @ApiPropertyOptional({ description: 'When reminder was sent' })
  reminderSentAt?: Date;

  @ApiPropertyOptional({
    description: 'Original appointment date if rescheduled',
  })
  originalAppointmentDate?: Date;

  @ApiPropertyOptional({ description: 'Reschedule reason' })
  rescheduleReason?: string;

  @ApiProperty({ description: 'Number of times rescheduled' })
  rescheduleCount: number;

  @ApiProperty({ description: 'Whether biometrics were captured' })
  biometricsCaptured: boolean;

  @ApiPropertyOptional({ description: 'When biometrics were captured' })
  capturedAt?: Date;

  @ApiPropertyOptional({ description: 'Who captured biometrics' })
  capturedBy?: string;

  @ApiPropertyOptional({ description: 'Capture quality assessment' })
  captureQuality?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Creator ID' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Last modifier ID' })
  lastModifiedBy?: string;
}
