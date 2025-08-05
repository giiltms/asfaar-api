import { Expose, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * BiometricCenter entity for API response serialization
 * Exposes all relevant biometric center information
 */
export class BiometricCenterEntity {
  @ApiProperty({ description: 'Unique identifier' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Center name' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'Center code' })
  @Expose()
  code: string;

  @ApiProperty({ description: 'Full address' })
  @Expose()
  address: string;

  @ApiProperty({ description: 'City' })
  @Expose()
  city: string;

  @ApiProperty({ description: 'State' })
  @Expose()
  state: string;

  @ApiProperty({ description: 'Country' })
  @Expose()
  country: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @Expose()
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @Expose()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @Expose()
  email?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @Expose()
  website?: string;

  @ApiProperty({ description: 'Active status' })
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Daily capacity' })
  @Expose()
  capacity?: number;

  @ApiPropertyOptional({ description: 'Opening time' })
  @Expose()
  openingTime?: string;

  @ApiPropertyOptional({ description: 'Closing time' })
  @Expose()
  closingTime?: string;

  @ApiProperty({ description: 'Working days', type: [String] })
  @Expose()
  workingDays: string[];

  @ApiProperty({ description: 'Appointment duration in minutes' })
  @Expose()
  appointmentDuration: number;

  @ApiProperty({ description: 'Buffer time in minutes' })
  @Expose()
  bufferTime: number;

  @ApiProperty({ description: 'Services offered', type: [String] })
  @Expose()
  servicesOffered: string[];

  @ApiProperty({ description: 'Special facilities', type: [String] })
  @Expose()
  specialFacilities: string[];

  @ApiPropertyOptional({ description: 'Manager ID' })
  @Expose()
  managerId?: string;

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
  @ApiPropertyOptional({ description: 'Full formatted address for display' })
  @Expose()
  get fullAddress(): string {
    const parts = [this.address, this.city, this.state, this.country].filter(
      Boolean,
    );
    if (this.postalCode) {
      parts.push(this.postalCode);
    }
    return parts.join(', ');
  }

  @ApiPropertyOptional({ description: 'Contact information summary' })
  @Expose()
  get contactInfo(): {
    phone?: string;
    email?: string;
    website?: string;
  } {
    return {
      phone: this.phone,
      email: this.email,
      website: this.website,
    };
  }

  @ApiPropertyOptional({ description: 'Operating hours summary' })
  @Expose()
  get operatingHours(): {
    openingTime?: string;
    closingTime?: string;
    workingDays: string[];
  } {
    return {
      openingTime: this.openingTime,
      closingTime: this.closingTime,
      workingDays: this.workingDays,
    };
  }

  @ApiPropertyOptional({
    description: 'Availability status based on isActive and current time',
  })
  @Expose()
  get availabilityStatus(): 'AVAILABLE' | 'CLOSED' | 'INACTIVE' {
    if (!this.isActive) {
      return 'INACTIVE';
    }

    // Check if center is currently open (basic implementation)
    const now = new Date();
    const currentDay = now
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();

    if (!this.workingDays?.includes(currentDay)) {
      return 'CLOSED';
    }

    // Additional time-based checks can be added here
    return 'AVAILABLE';
  }
}
