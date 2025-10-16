import { Expose, Transform } from 'class-transformer';
import { AppointmentClass, QueueStatus } from '@prisma/client';

export class QueueEntity {
  @Expose()
  id: string;

  @Expose()
  appointmentId: string;

  @Expose()
  centerId: string;

  @Expose()
  appointmentClass: AppointmentClass;

  @Expose()
  queueNumber: number;

  @Expose()
  status: QueueStatus;

  @Expose()
  priority: number;

  @Expose()
  @Transform(({ value }) => value?.toISOString())
  joinedAt: Date;

  @Expose()
  @Transform(({ value }) => value?.toISOString())
  calledAt?: Date;

  @Expose()
  @Transform(({ value }) => value?.toISOString())
  startedAt?: Date;

  @Expose()
  @Transform(({ value }) => value?.toISOString())
  completedAt?: Date;

  @Expose()
  boothId?: string;

  @Expose()
  estimatedWaitTime?: number;

  @Expose()
  estimatedServiceTime?: number;

  // Application reference number from form submission
  @Expose()
  @Transform(({ obj }) => obj?.appointment?.submission?.referenceNumber)
  referenceNumber?: string;

  // Computed properties
  @Expose()
  get statusDisplay(): string {
    switch (this.status) {
      case QueueStatus.WAITING:
        return 'Waiting in Queue';
      case QueueStatus.CALLED:
        return 'Called to Booth';
      case QueueStatus.IN_PROGRESS:
        return 'Service in Progress';
      case QueueStatus.COMPLETED:
        return 'Service Completed';
      case QueueStatus.NO_SHOW:
        return 'No Show';
      case QueueStatus.CANCELLED:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  @Expose()
  get isActive(): boolean {
    const activeStatuses = [
      QueueStatus.WAITING,
      QueueStatus.CALLED,
      QueueStatus.IN_PROGRESS,
    ] as QueueStatus[];
    return activeStatuses.includes(this.status);
  }

  @Expose()
  get canCancel(): boolean {
    const cancellableStatuses = [
      QueueStatus.WAITING,
      QueueStatus.CALLED,
    ] as QueueStatus[];
    return cancellableStatuses.includes(this.status);
  }

  @Expose()
  get waitTimeDisplay(): string {
    if (!this.estimatedWaitTime) return 'Calculating...';

    const hours = Math.floor(this.estimatedWaitTime / 60);
    const minutes = this.estimatedWaitTime % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  @Expose()
  get classDisplay(): string {
    switch (this.appointmentClass) {
      case AppointmentClass.VIP:
        return 'VIP';
      case AppointmentClass.PREMIUM:
        return 'Premium';
      case AppointmentClass.REGULAR:
        return 'Regular';
      default:
        return 'Unknown';
    }
  }

  @Expose()
  get totalWaitTime(): number | null {
    if (!this.calledAt || !this.joinedAt) return null;

    const joinTime = new Date(this.joinedAt).getTime();
    const callTime = new Date(this.calledAt).getTime();

    return Math.floor((callTime - joinTime) / (1000 * 60)); // Minutes
  }

  @Expose()
  get totalServiceTime(): number | null {
    if (!this.startedAt || !this.completedAt) return null;

    const startTime = new Date(this.startedAt).getTime();
    const endTime = new Date(this.completedAt).getTime();

    return Math.floor((endTime - startTime) / (1000 * 60)); // Minutes
  }

  @Expose()
  get priorityDisplay(): string {
    if (this.priority === 0) return 'Normal';
    if (this.priority >= 50) return 'High Priority';
    if (this.priority >= 25) return 'Medium Priority';
    return 'Low Priority';
  }

  constructor(partial: Partial<QueueEntity>) {
    Object.assign(this, partial);
  }
}
