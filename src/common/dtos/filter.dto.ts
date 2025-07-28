import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class DateFilterDto {
  @ApiPropertyOptional({
    description: 'Filter records created after this date',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  createdAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter records created before this date',
    example: '2023-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  createdBefore?: string;

  @ApiPropertyOptional({
    description: 'Filter records updated after this date',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  updatedAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter records updated before this date',
    example: '2023-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  updatedBefore?: string;
}

export class UserFilterDto extends DateFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by email',
    example: 'user@example.com',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: 'true',
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by verified status',
    example: 'true',
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsOptional()
  isVerified?: boolean;
} 