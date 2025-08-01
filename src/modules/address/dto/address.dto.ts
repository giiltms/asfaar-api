import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsNumber,
  IsLatitude,
  IsLongitude,
  MaxLength,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { AddressType } from '@prisma/client';

// Base Address DTO for responses
export class AddressDto {
  @ApiProperty({
    description: 'Unique address identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'User ID this address belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'House number and street name',
    example: '123 Adeniyi Street',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional({
    description: 'Apartment, suite, floor, etc.',
    example: 'Apartment 4B',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({
    description: 'Area, district, or neighborhood',
    example: 'Victoria Island',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({
    description: 'City or town',
    example: 'Lagos',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Local Government Area (Nigeria specific)',
    example: 'Eti-Osa',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  lga?: string;

  @ApiPropertyOptional({
    description: 'State or province',
    example: 'Lagos',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal or ZIP code',
    example: '101241',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({
    description: 'Country',
    example: 'Nigeria',
    default: 'Nigeria',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  country: string;

  @ApiProperty({
    description: 'Address type',
    enum: AddressType,
    example: AddressType.HOME,
  })
  @IsEnum(AddressType)
  type: AddressType;

  @ApiProperty({
    description: 'Whether this is the default address',
    example: false,
  })
  @IsBoolean()
  isDefault: boolean;

  @ApiProperty({
    description: 'Whether this address has been verified',
    example: false,
  })
  @IsBoolean()
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 6.4281,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: 3.4219,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Custom label for the address',
    example: 'Office',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @ApiPropertyOptional({
    description: 'Special delivery instructions',
    example: 'Ring doorbell twice',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;

  @ApiProperty({
    description: 'Address creation timestamp',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Address last update timestamp',
    example: '2023-01-01T00:00:00Z',
  })
  updatedAt: Date;
}

// Create Address DTO
export class CreateAddressDto {
  @ApiProperty({
    description: 'House number and street name',
    example: '123 Adeniyi Street',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  @MinLength(1)
  addressLine1: string;

  @ApiPropertyOptional({
    description: 'Apartment, suite, floor, etc.',
    example: 'Apartment 4B',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressLine2?: string;

  @ApiPropertyOptional({
    description: 'Area, district, or neighborhood',
    example: 'Victoria Island',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @ApiProperty({
    description: 'City or town',
    example: 'Lagos',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @MinLength(1)
  city: string;

  @ApiPropertyOptional({
    description: 'Local Government Area (Nigeria specific)',
    example: 'Eti-Osa',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lga?: string;

  @ApiProperty({
    description: 'State or province',
    example: 'Lagos',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @MinLength(1)
  state: string;

  @ApiPropertyOptional({
    description: 'Postal or ZIP code',
    example: '101241',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiProperty({
    description: 'Country',
    example: 'Nigeria',
    default: 'Nigeria',
    maxLength: 100,
  })
  @IsString()
  @MaxLength(100)
  @MinLength(1)
  @Transform(({ value }) => value || 'Nigeria')
  country: string = 'Nigeria';

  @ApiProperty({
    description: 'Address type',
    enum: AddressType,
    example: AddressType.HOME,
    default: AddressType.HOME,
  })
  @IsEnum(AddressType)
  @Transform(({ value }) => value || AddressType.HOME)
  type: AddressType = AddressType.HOME;

  @ApiProperty({
    description: 'Set as default address',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isDefault?: boolean = false;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 6.4281,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @IsLatitude()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: 3.4219,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @IsLongitude()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Custom label for the address',
    example: 'Office',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  label?: string;

  @ApiPropertyOptional({
    description: 'Special delivery instructions',
    example: 'Ring doorbell twice',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;
}

// Update Address DTO
export class UpdateAddressDto extends PartialType(CreateAddressDto) {
  @ApiPropertyOptional({
    description: 'Whether this address has been verified',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isVerified?: boolean;
}

// Address Summary DTO (for lists)
export class AddressSummaryDto {
  @ApiProperty({
    description: 'Unique address identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Formatted address line',
    example: '123 Adeniyi Street, Victoria Island, Lagos',
  })
  formattedAddress: string;

  @ApiProperty({
    description: 'Address type',
    enum: AddressType,
    example: AddressType.HOME,
  })
  type: AddressType;

  @ApiProperty({
    description: 'Whether this is the default address',
    example: false,
  })
  isDefault: boolean;

  @ApiProperty({
    description: 'Whether this address has been verified',
    example: false,
  })
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'Custom label for the address',
    example: 'Office',
  })
  label?: string;

  @ApiProperty({
    description: 'Country',
    example: 'Nigeria',
  })
  country: string;

  @ApiProperty({
    description: 'State or province',
    example: 'Lagos',
  })
  state: string;

  @ApiProperty({
    description: 'City or town',
    example: 'Lagos',
  })
  city: string;
}

// Set Default Address DTO
export class SetDefaultAddressDto {
  @ApiProperty({
    description: 'Address ID to set as default',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  addressId: string;
} 