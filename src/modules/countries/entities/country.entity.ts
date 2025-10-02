import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Country } from '@prisma/client';

export default class CountryEntity implements Country {
  @ApiProperty({ description: 'Country ID' })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Country name',
    example: 'Kingdom of Saudi Arabia',
  })
  @Expose()
  name: string;

  @ApiProperty({ description: 'ISO 2-letter country code', example: 'SA' })
  @Expose()
  isoCode2: string;

  @ApiProperty({ description: 'ISO 3-letter country code', example: 'SAU' })
  @Expose()
  isoCode3: string;

  @ApiProperty({ description: 'ISO numeric country code', example: '682' })
  @Expose()
  numericCode: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'SAR' })
  @Expose()
  currency: string | null;

  @ApiPropertyOptional({ description: 'Currency name', example: 'Saudi Riyal' })
  @Expose()
  currencyName: string | null;

  @ApiPropertyOptional({
    description: 'International dial code',
    example: '+966',
  })
  @Expose()
  dialCode: string | null;

  @ApiPropertyOptional({ description: 'Geographic region', example: 'Asia' })
  @Expose()
  region: string | null;

  @ApiPropertyOptional({
    description: 'Geographic subregion',
    example: 'Western Asia',
  })
  @Expose()
  subregion: string | null;

  @ApiPropertyOptional({ description: 'Capital city', example: 'Riyadh' })
  @Expose()
  capital: string | null;

  @ApiPropertyOptional({ description: 'Country flag emoji', example: '🇸🇦' })
  @Expose()
  flag: string | null;

  @ApiPropertyOptional({
    description: 'Country logo/emblem URL',
    example: '/uploads/countries/logos/sa-logo.png',
  })
  @Expose()
  logoUrl: string | null;

  @ApiProperty({
    description: 'Whether country is active for visa applications',
  })
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Visa processing days', example: 7 })
  @Expose()
  visaProcessingDays: number | null;

  @ApiPropertyOptional({
    description: 'Maximum applications per year',
    example: 5000,
  })
  @Expose()
  maxApplications: number | null;

  @ApiPropertyOptional({ description: 'Application fee in USD', example: 150 })
  @Expose()
  @Transform(({ value }) => {
    if (value === null || value === undefined) return null;
    try {
      // Handle Prisma Decimal type
      if (value && typeof value === 'object' && 'toNumber' in value) {
        return value.toNumber();
      }
      // Handle string values
      if (typeof value === 'string') {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : null;
      }
      // Handle number values
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
      }
      // Fallback: try to convert to string then parse
      const stringValue = String(value);
      const num = parseFloat(stringValue);
      return Number.isFinite(num) ? num : null;
    } catch (error) {
      console.warn('Failed to transform applicationFee:', value, error);
      return null;
    }
  })
  applicationFee: any | null;

  @ApiProperty({ description: 'Country creation date' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'Country last update date' })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Created by user ID' })
  @Expose()
  createdBy: string | null;

  // Computed properties
  @ApiPropertyOptional({ description: 'Whether country has active forms' })
  @Expose()
  @Transform(({ obj }) => {
    return obj.forms ? obj.forms.length > 0 : false;
  })
  get hasActiveForms(): boolean {
    return this.forms ? this.forms.length > 0 : false;
  }

  @ApiPropertyOptional({ description: 'Total applications this year' })
  @Expose()
  @Transform(({ obj }) => {
    const currentYear = new Date().getFullYear();
    const counter = obj.applicationCounters?.find(
      (ac: any) => ac.year === currentYear,
    );
    return counter?.counter || 0;
  })
  get currentYearApplications(): number {
    const currentYear = new Date().getFullYear();
    const counter = this.applicationCounters?.find(
      (ac: any) => ac.year === currentYear,
    );
    return counter?.counter || 0;
  }

  @ApiPropertyOptional({ description: 'Remaining application slots this year' })
  @Expose()
  get remainingSlots(): number {
    const maxApps = this.maxApplications || 1000;
    return Math.max(0, maxApps - this.currentYearApplications);
  }

  @ApiPropertyOptional({ description: 'Application utilization percentage' })
  @Expose()
  get utilizationPercentage(): number {
    const maxApps = this.maxApplications || 1000;
    if (maxApps === 0) return 0;
    return (
      Math.round((this.currentYearApplications / maxApps) * 100 * 100) / 100
    );
  }

  // Relations (optional, only included when requested)
  @ApiPropertyOptional({ description: 'Country forms', type: 'array' })
  @Expose()
  @Type(() => Object)
  forms?: any[];

  @ApiPropertyOptional({ description: 'Application counters', type: 'array' })
  @Expose()
  @Type(() => Object)
  applicationCounters?: any[];

  constructor(partial: Partial<CountryEntity>) {
    Object.assign(this, partial);
  }
}
