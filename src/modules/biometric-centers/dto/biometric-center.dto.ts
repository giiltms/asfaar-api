import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  ArrayNotEmpty,
  IsUrl,
  Min,
  Max,
  Matches,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dtos/pagination.dto';

// Base DTO for creating a biometric center
export class CreateBiometricCenterDto {
  @ApiProperty({
    description: 'Name of the biometric center',
    example: 'ASFAAR-ABUJA HQ',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Unique code for the center',
    example: 'ASFAAR-ABJ-HQ',
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Full address of the center',
    example: '14 Yedseram Street, Maitama, Abuja, Nigeria',
  })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({
    description: 'City where the center is located',
    example: 'Abuja',
  })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({
    description: 'State/Province where the center is located',
    example: 'Federal Capital Territory',
  })
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiPropertyOptional({
    description: 'Country where the center is located',
    example: 'Nigeria',
    default: 'Nigeria',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Postal/ZIP code',
    example: '900001',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+2347007004001',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid international format',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'info@asfaarvisaservices.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://asfaarvisaservices.com',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'Whether the center is currently operational',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Daily appointment capacity',
    example: 50,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  capacity?: number;

  @ApiPropertyOptional({
    description: 'Opening time in HH:mm format',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Opening time must be in HH:mm format',
  })
  openingTime?: string;

  @ApiPropertyOptional({
    description: 'Closing time in HH:mm format',
    example: '17:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Closing time must be in HH:mm format',
  })
  closingTime?: string;

  @ApiPropertyOptional({
    description: 'Working days of the week',
    example: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(
    [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ],
    { each: true },
  )
  workingDays?: string[];

  @ApiPropertyOptional({
    description: 'Duration per appointment in minutes',
    example: 30,
    default: 30,
    minimum: 15,
    maximum: 120,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(15)
  @Max(120)
  appointmentDuration?: number;

  @ApiPropertyOptional({
    description: 'Buffer time between appointments in minutes',
    example: 15,
    default: 15,
    minimum: 0,
    maximum: 60,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  @Max(60)
  bufferTime?: number;

  @ApiPropertyOptional({
    description: 'Services offered at this center',
    example: ['BIOMETRIC_CAPTURE', 'DOCUMENT_VERIFICATION', 'PHOTO_CAPTURE'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicesOffered?: string[];

  @ApiPropertyOptional({
    description: 'Special facilities available',
    example: ['WHEELCHAIR_ACCESS', 'PARKING_AVAILABLE', 'PUBLIC_TRANSPORT'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialFacilities?: string[];

  @ApiPropertyOptional({
    description: 'Manager user ID',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsString()
  managerId?: string;
}

// DTO for updating a biometric center (all fields optional except ID)
export class UpdateBiometricCenterDto extends PartialType(
  CreateBiometricCenterDto,
) {}

// DTO for filtering biometric centers
export class BiometricCenterFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'Abuja',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by state',
    example: 'Federal Capital Territory',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search by name or code',
    example: 'ASFAAR',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class BiometricCenterQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by city',
    example: 'Abuja',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Filter by state',
    example: 'Federal Capital Territory',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Search by name or code',
    example: 'ASFAAR',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

// Response DTO for biometric center
export class BiometricCenterResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Center name' })
  name: string;

  @ApiProperty({ description: 'Center code' })
  code: string;

  @ApiProperty({ description: 'Full address' })
  address: string;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'State' })
  state: string;

  @ApiProperty({ description: 'Country' })
  country: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  website?: string;

  @ApiProperty({ description: 'Active status' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Daily capacity' })
  capacity?: number;

  @ApiPropertyOptional({ description: 'Opening time' })
  openingTime?: string;

  @ApiPropertyOptional({ description: 'Closing time' })
  closingTime?: string;

  @ApiProperty({ description: 'Working days', type: [String] })
  workingDays: string[];

  @ApiProperty({ description: 'Appointment duration in minutes' })
  appointmentDuration: number;

  @ApiProperty({ description: 'Buffer time in minutes' })
  bufferTime: number;

  @ApiProperty({ description: 'Services offered', type: [String] })
  servicesOffered: string[];

  @ApiProperty({ description: 'Special facilities', type: [String] })
  specialFacilities: string[];

  @ApiPropertyOptional({ description: 'Manager ID' })
  managerId?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Creator ID' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Last modifier ID' })
  lastModifiedBy?: string;
}
