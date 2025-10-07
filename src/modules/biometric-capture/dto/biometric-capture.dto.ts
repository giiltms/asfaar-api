import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsNumber, IsString, IsUUID } from 'class-validator';

export class FingerprintListQueryDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by submission ID' })
  @IsOptional()
  @IsUUID()
  submissionId?: string;
}
