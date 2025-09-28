import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
} from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({
    description: 'Department name',
    example: 'Immigration Services',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Agency that the department belongs to',
    example: 'Ministry of Interior',
  })
  @IsString()
  @IsNotEmpty()
  agency: string;

  @ApiProperty({
    description: 'Department description',
    example: 'Handles immigration and visa processing services',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description:
      'URL to department logo (optional if uploading file via multipart)',
    example: 'https://example.com/logos/immigration-logo.png',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({
    description: 'Department name',
    example: 'Immigration Services',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Agency that the department belongs to',
    example: 'Ministry of Interior',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  agency?: string;

  @ApiPropertyOptional({
    description: 'Department description',
    example: 'Handles immigration and visa processing services',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL to department logo',
    example: 'https://example.com/logos/immigration-logo.png',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  logoUrl?: string;
}

export class CreateDepartmentMultipartDto {
  @ApiProperty({
    description: 'Department name',
    example: 'Immigration Services',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Agency that the department belongs to',
    example: 'Ministry of Interior',
  })
  @IsString()
  @IsNotEmpty()
  agency: string;

  @ApiProperty({
    description: 'Department description',
    example: 'Handles immigration and visa processing services',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

}

export class DepartmentQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search term for department name or agency',
    example: 'immigration',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by agency',
    example: 'Ministry of Interior',
  })
  @IsOptional()
  @IsString()
  agency?: string;
}
