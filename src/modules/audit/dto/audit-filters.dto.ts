import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '@prisma/client';
import { AuditResourceTypeColumns } from '../types';

export class AuditLogFiltersDTO {
  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter audit logs created after this date (ISO 8601 format)',
    required: false,
  })
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter audit logs created before this date (ISO 8601 format)',
    required: false,
  })
  createdBefore?: string;

  @ApiPropertyOptional({
    example: Roles.PASSENGER,
    description: 'Filter audit logs by user roles',
  })
  @IsEnum(Roles)
  @IsOptional()
  readonly userRole?: Roles;

  @ApiPropertyOptional({
    example: AuditResourceTypeColumns.CAMPAIGN,
    description: 'Filter audit logs by the entity affected',
  })
  @IsEnum(AuditResourceTypeColumns)
  @IsOptional()
  readonly resourceType?: AuditResourceTypeColumns;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Search query to filter by user name or description',
    required: false,
  })
  search?: string;
}
