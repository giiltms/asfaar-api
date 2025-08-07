import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDecimal,
  IsNotEmpty,
  Length,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dtos/pagination.dto';

export class CreateCountryDto {
  @ApiProperty({ description: 'Country name', example: 'Kingdom of Saudi Arabia' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiProperty({ description: 'ISO 2-letter country code', example: 'SA' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  @Transform(({ value }) => value?.toUpperCase())
  isoCode2: string;

  @ApiProperty({ description: 'ISO 3-letter country code', example: 'SAU' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @Transform(({ value }) => value?.toUpperCase())
  isoCode3: string;

  @ApiProperty({ description: 'ISO numeric country code', example: '682' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  numericCode: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'SAR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => value?.toUpperCase())
  currency?: string;

  @ApiPropertyOptional({ description: 'Currency name', example: 'Saudi Riyal' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  currencyName?: string;

  @ApiPropertyOptional({ description: 'International dial code', example: '+966' })
  @IsOptional()
  @IsString()
  dialCode?: string;

  @ApiPropertyOptional({ description: 'Geographic region', example: 'Asia' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  region?: string;

  @ApiPropertyOptional({ description: 'Geographic subregion', example: 'Western Asia' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  subregion?: string;

  @ApiPropertyOptional({ description: 'Capital city', example: 'Riyadh' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  capital?: string;

  @ApiPropertyOptional({ description: 'Country flag emoji', example: '🇸🇦' })
  @IsOptional()
  @IsString()
  flag?: string;

  @ApiPropertyOptional({ description: 'Whether country is active for visa applications', default: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Visa processing days', example: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  visaProcessingDays?: number;

  @ApiPropertyOptional({ description: 'Maximum applications per year', example: 5000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  @Type(() => Number)
  maxApplications?: number;

  @ApiPropertyOptional({ description: 'Application fee in USD', example: 150 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => Number)
  applicationFee?: number;
}

export class UpdateCountryDto {
  @ApiPropertyOptional({ description: 'Country name', example: 'Kingdom of Saudi Arabia' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'ISO 2-letter country code', example: 'SA' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  @Transform(({ value }) => value?.toUpperCase())
  isoCode2?: string;

  @ApiPropertyOptional({ description: 'ISO 3-letter country code', example: 'SAU' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @Transform(({ value }) => value?.toUpperCase())
  isoCode3?: string;

  @ApiPropertyOptional({ description: 'ISO numeric country code', example: '682' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  numericCode?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'SAR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => value?.toUpperCase())
  currency?: string;

  @ApiPropertyOptional({ description: 'Currency name', example: 'Saudi Riyal' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  currencyName?: string;

  @ApiPropertyOptional({ description: 'International dial code', example: '+966' })
  @IsOptional()
  @IsString()
  dialCode?: string;

  @ApiPropertyOptional({ description: 'Geographic region', example: 'Asia' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  region?: string;

  @ApiPropertyOptional({ description: 'Geographic subregion', example: 'Western Asia' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  subregion?: string;

  @ApiPropertyOptional({ description: 'Capital city', example: 'Riyadh' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  capital?: string;

  @ApiPropertyOptional({ description: 'Country flag emoji', example: '🇸🇦' })
  @IsOptional()
  @IsString()
  flag?: string;

  @ApiPropertyOptional({ description: 'Whether country is active for visa applications' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Visa processing days', example: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  visaProcessingDays?: number;

  @ApiPropertyOptional({ description: 'Maximum applications per year', example: 5000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  @Type(() => Number)
  maxApplications?: number;

  @ApiPropertyOptional({ description: 'Application fee in USD', example: 150 })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  @Type(() => Number)
  applicationFee?: number;
}

export class CountryFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by country name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Filter by ISO 2-letter code' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Transform(({ value }) => value?.toUpperCase())
  isoCode2?: string;

  @ApiPropertyOptional({ description: 'Filter by ISO 3-letter code' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => value?.toUpperCase())
  isoCode3?: string;

  @ApiPropertyOptional({ description: 'Filter by region' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Filter by subregion' })
  @IsOptional()
  @IsString()
  subregion?: string;

  @ApiPropertyOptional({ description: 'Filter by currency' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => value?.toUpperCase())
  currency?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['name', 'isoCode2', 'region', 'visaProcessingDays', 'applicationFee', 'createdAt']
  })
  @IsOptional()
  @IsIn(['name', 'isoCode2', 'region', 'visaProcessingDays', 'applicationFee', 'createdAt'])
  sortBy?: string = 'name';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}

export class CountryStatsDto {
  @ApiProperty({ description: 'Total number of countries' })
  total: number;

  @ApiProperty({ description: 'Number of active countries' })
  active: number;

  @ApiProperty({ description: 'Number of inactive countries' })
  inactive: number;

  @ApiProperty({ description: 'Countries by region' })
  byRegion: Record<string, number>;

  @ApiProperty({ description: 'Total application capacity' })
  totalCapacity: number;

  @ApiProperty({ description: 'Average processing days' })
  averageProcessingDays: number;
}

export class CountryApplicationStatsDto {
  @ApiProperty({ description: 'Country ID' })
  countryId: string;

  @ApiProperty({ description: 'Country name' })
  countryName: string;

  @ApiProperty({ description: 'ISO 2-letter code' })
  isoCode2: string;

  @ApiProperty({ description: 'Current year' })
  year: number;

  @ApiProperty({ description: 'Total applications this year' })
  totalApplications: number;

  @ApiProperty({ description: 'Maximum applications allowed' })
  maxApplications: number;

  @ApiProperty({ description: 'Remaining application slots' })
  remainingSlots: number;

  @ApiProperty({ description: 'Utilization percentage' })
  utilizationPercentage: number;
} 