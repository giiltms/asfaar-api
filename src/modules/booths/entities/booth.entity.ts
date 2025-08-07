import { Expose, Transform } from 'class-transformer';
import { AppointmentClass } from '@prisma/client';

export class BoothEntity {
  @Expose()
  id: string;

  @Expose()
  boothNumber: string;

  @Expose()
  centerId: string;

  @Expose()
  appointmentClass: AppointmentClass;

  @Expose()
  isActive: boolean;

  @Expose()
  isOccupied: boolean;

  @Expose()
  hasCamera: boolean;

  @Expose()
  hasFingerprintScanner: boolean;

  @Expose()
  hasSignaturePad: boolean;

  @Expose()
  agentId?: string;

  @Expose()
  @Transform(({ value }) => value?.toISOString())
  createdAt: Date;

  @Expose()
  @Transform(({ value }) => value?.toISOString())
  updatedAt: Date;

  @Expose()
  createdBy?: string;

  @Expose()
  lastModifiedBy?: string;

  // Computed properties
  @Expose()
  get isAvailable(): boolean {
    return this.isActive && !this.isOccupied;
  }

  @Expose()
  get statusDisplay(): string {
    if (!this.isActive) return 'Inactive';
    if (this.isOccupied) return 'Occupied';
    return 'Available';
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
  get capabilities(): string[] {
    const capabilities: string[] = [];
    if (this.hasCamera) capabilities.push('Camera');
    if (this.hasFingerprintScanner) capabilities.push('Fingerprint Scanner');
    if (this.hasSignaturePad) capabilities.push('Signature Pad');
    return capabilities;
  }

  @Expose()
  get hasAgent(): boolean {
    return !!this.agentId;
  }

  constructor(partial: Partial<BoothEntity>) {
    Object.assign(this, partial);
  }
} 