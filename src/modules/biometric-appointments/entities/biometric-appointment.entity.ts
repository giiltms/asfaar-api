import { Expose, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentClass, AppointmentStatus } from '@prisma/client';

/**
 * BiometricAppointment entity for API response serialization
 * Exposes all relevant appointment information
 */
export class BiometricAppointmentEntity {
  @ApiProperty({ description: 'Unique identifier' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User ID' })
  @Expose()
  userId: string;

  @ApiProperty({ description: 'Form submission ID' })
  @Expose()
  submissionId: string;

  @ApiProperty({ description: 'Biometric center ID' })
  @Expose()
  centerId: string;

  @ApiProperty({ description: 'Appointment class', enum: AppointmentClass })
  @Expose()
  appointmentClass: AppointmentClass;

  @ApiProperty({ description: 'Appointment status', enum: AppointmentStatus })
  @Expose()
  status: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Appointment time' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  appointmentTime?: Date;

  @ApiPropertyOptional({ description: 'Special requirements' })
  @Expose()
  specialRequirements?: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @Expose()
  adminNotes?: string;

  @ApiProperty({ description: 'Confirmation acknowledged' })
  @Expose()
  confirmationAcknowledged: boolean;

  @ApiProperty({ description: 'Consent acknowledged' })
  @Expose()
  consentAcknowledged: boolean;

  @ApiProperty({ description: 'Terms acknowledged' })
  @Expose()
  termsAcknowledged: boolean;

  @ApiProperty({ description: 'Reminder sent status' })
  @Expose()
  reminderSent: boolean;

  @ApiPropertyOptional({ description: 'When reminder was sent' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  reminderSentAt?: Date;

  @ApiPropertyOptional({
    description: 'Original appointment date if rescheduled',
  })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  originalAppointmentDate?: Date;

  @ApiPropertyOptional({ description: 'Reschedule reason' })
  @Expose()
  rescheduleReason?: string;

  @ApiProperty({ description: 'Number of times rescheduled' })
  @Expose()
  rescheduleCount: number;

  @ApiProperty({ description: 'Whether biometrics were captured' })
  @Expose()
  biometricsCaptured: boolean;

  @ApiPropertyOptional({ description: 'When biometrics were captured' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  capturedAt?: Date;

  @ApiPropertyOptional({ description: 'Who captured biometrics' })
  @Expose()
  capturedBy?: string;

  @ApiPropertyOptional({ description: 'Capture quality assessment' })
  @Expose()
  captureQuality?: string;

  @ApiProperty({
    description:
      'Whether applicant has been assigned to a booth (status is AT_BOOTH, has biometric session, or has boothId in queue)',
  })
  @Expose()
  assignedToBooth: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Creator ID' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Last modifier ID' })
  @Expose()
  lastModifiedBy?: string;

  // Computed properties for convenience
  @ApiPropertyOptional({ description: 'Whether appointment is active' })
  @Expose()
  get isActive(): boolean {
    return this.status === AppointmentStatus.ACTIVE;
  }

  @ApiPropertyOptional({ description: 'Whether appointment is completed' })
  @Expose()
  get isCompleted(): boolean {
    return this.status === AppointmentStatus.COMPLETED;
  }

  @ApiPropertyOptional({ description: 'Whether appointment is pending' })
  @Expose()
  get isPending(): boolean {
    return this.status === AppointmentStatus.PENDING;
  }

  @ApiPropertyOptional({
    description: 'Whether appointment can be rescheduled',
  })
  @Expose()
  get canReschedule(): boolean {
    const allowedStatuses = [
      AppointmentStatus.PENDING,
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.ACTIVE,
    ] as AppointmentStatus[];
    return allowedStatuses.includes(this.status);
  }

  @ApiPropertyOptional({ description: 'Whether appointment can be cancelled' })
  @Expose()
  get canCancel(): boolean {
    const allowedStatuses = [
      AppointmentStatus.PENDING,
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.ACTIVE,
    ] as AppointmentStatus[];
    return allowedStatuses.includes(this.status);
  }

  @ApiPropertyOptional({ description: 'Status display text' })
  @Expose()
  get statusDisplay(): string {
    const statusMap = {
      [AppointmentStatus.PENDING]: 'Pending Payment',
      [AppointmentStatus.SCHEDULED]: 'Scheduled',
      [AppointmentStatus.ACTIVE]: 'Active',
      [AppointmentStatus.COMPLETED]: 'Completed',
      [AppointmentStatus.CANCELLED]: 'Cancelled',
      [AppointmentStatus.RESCHEDULED]: 'Rescheduled',
      [AppointmentStatus.NO_SHOW]: 'No Show',
    };

    return statusMap[this.status] || this.status;
  }

  @ApiPropertyOptional({ description: 'Appointment class display text' })
  @Expose()
  get classDisplay(): string {
    const classMap = {
      [AppointmentClass.REGULAR]: 'Regular',
      [AppointmentClass.VIP]: 'VIP',
      [AppointmentClass.PREMIUM]: 'Premium',
    };

    return classMap[this.appointmentClass] || this.appointmentClass;
  }

  @ApiPropertyOptional({ description: 'All acknowledgments completed' })
  @Expose()
  get allAcknowledged(): boolean {
    return (
      this.confirmationAcknowledged &&
      this.consentAcknowledged &&
      this.termsAcknowledged
    );
  }
}
