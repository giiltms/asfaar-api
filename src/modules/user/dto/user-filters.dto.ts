import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '@prisma/client';

export class UserFiltersDTO {
  @ApiPropertyOptional({
    enum: Roles,
    description: 'Filter users by their roles',
  })
  @IsOptional()
  @IsEnum(Roles)
  role?: Roles;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter users created after this date (ISO 8601 format)',
    required: false,
  })
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter users created before this date (ISO 8601 format)',
    required: false,
  })
  createdBefore?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Search query to filter by user name or description',
    required: false,
  })
  search?: string;
}
