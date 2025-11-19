import { User } from '@prisma/client';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export default class UserEntity implements User {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  phone: string;

  @Expose()
  firstName: string;

  @Expose()
  middleName: string;

  @Expose()
  lastName: string;

  @Expose()
  username: string;

  @Expose()
  gender: any; // Use any to avoid Gender enum issues for now

  @Expose()
  dateOfBirth: Date;

  @Exclude()
  password: string;

  @Expose()
  avatar: string;

  @Expose()
  bio: string;

  @Expose()
  website: string;

  @Expose()
  nin: string; // National Identity Number

  @ApiProperty({
    description: 'Whether the user has verified their NIN',
    example: false,
  })
  @Expose()
  ninVerified: boolean;

  @Expose()
  state: string; // User's state

  @Expose()
  lga: string; // Local Government Area

  @Expose()
  timezone: string;

  @Expose()
  locale: string;

  @Expose()
  roles: any[]; // Use any[] to avoid role enum issues for now

  @Expose()
  status: any; // Use any to avoid Status enum issues for now

  @Expose()
  isVerified: boolean;

  @Expose()
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the user has completed onboarding payment',
    example: false,
  })
  @Expose()
  onboardingPaid: boolean;

  @Expose()
  lastLoginAt: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  countryId: string | null;

  @ApiPropertyOptional({
    description: 'User addresses (default address first)',
    type: 'object',
    isArray: true,
  })
  @Expose()
  @Type(() => Object)
  addresses?: any[]; // Using any[] to avoid circular dependency issues

  @ApiPropertyOptional({
    description: 'Default address',
    type: 'object',
  })
  @Expose()
  @Transform(({ obj }) => {
    // Find and return the default address
    return obj.addresses?.find((addr: any) => addr.isDefault) || null;
  })
  get defaultAddress(): any {
    return this.addresses?.find((addr: any) => addr.isDefault) || null;
  }

  @ApiPropertyOptional({
    description: 'User departments',
    type: 'object',
    isArray: true,
  })
  @Expose()
  @Type(() => Object)
  departments?: any[]; // Using any[] to avoid circular dependency issues

  @ApiPropertyOptional({
    description: 'User assigned country (for embassy officers)',
    type: 'object',
  })
  @Expose()
  @Type(() => Object)
  country?: any; // Using any to avoid circular dependency issues

  @ApiPropertyOptional({
    description: 'Current/latest NIN verification details',
    type: 'object',
  })
  @Expose()
  @Type(() => Object)
  currentNinVerification?: any; // Single NIN verification object (mapped from array in service)

  @ApiPropertyOptional({
    description: 'Centers assigned to the user',
    type: 'object',
    isArray: true,
    example: [
      {
        id: 'center-uuid-1',
        name: 'ASFAAR-ABUJA HQ',
        code: 'ASFAAR-ABJ-HQ',
        address: '123 Main Street, Abuja',
        city: 'Abuja',
        state: 'FCT',
        isActive: true,
      },
    ],
  })
  @Expose()
  @Type(() => Object)
  biometricCenters?: any[]; // Using any[] to avoid circular dependency issues

  @ApiPropertyOptional({
    description:
      'Travel agent profile with company information (for agents only)',
    type: 'object',
  })
  @Expose()
  @Type(() => Object)
  travelAgentProfile?: any; // Travel agent profile with normalized company data

  @ApiPropertyOptional({
    description: 'Travel agent license/certificate (for agents only)',
    type: 'object',
  })
  @Expose()
  @Type(() => Object)
  travelAgentLicense?: any; // Travel agent license with license number, status, expiry, etc.

  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
