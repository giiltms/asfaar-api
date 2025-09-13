import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class ApplicationDataDto {
  @ApiProperty({
    description: 'Total number of applications',
    example: 10332,
  })
  total: number;

  @ApiProperty({
    description: 'Number of draft applications',
    example: 500,
  })
  draft: number;

  @ApiProperty({
    description: 'Number of applications pending payment',
    example: 800,
  })
  pendingPayment: number;

  @ApiProperty({
    description: 'Number of submitted applications',
    example: 1200,
  })
  submitted: number;

  @ApiProperty({
    description: 'Number of applications under review',
    example: 1500,
  })
  underReview: number;

  @ApiProperty({
    description: 'Number of flagged applications',
    example: 200,
  })
  flagged: number;

  @ApiProperty({
    description: 'Number of queried applications',
    example: 300,
  })
  queried: number;

  @ApiProperty({
    description: 'Number of applications being processed',
    example: 1000,
  })
  processing: number;

  @ApiProperty({
    description: 'Number of applications pending biometrics',
    example: 600,
  })
  pendingBiometrics: number;

  @ApiProperty({
    description: 'Number of approved applications',
    example: 6200,
  })
  approved: number;

  @ApiProperty({
    description: 'Number of rejected applications',
    example: 1033,
  })
  rejected: number;

  @ApiProperty({
    description: 'Number of cancelled applications',
    example: 200,
  })
  cancelled: number;
}

export class UserStatisticsDto {
  @ApiProperty({
    description: 'Total number of users',
    example: 1247,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Number of top agents (biometric agents)',
    example: 156,
  })
  topAgents: number;

  @ApiProperty({
    description: 'Number of applications completed today',
    example: 89,
  })
  completedToday: number;
}

export class RoleDistributionDto {
  @ApiProperty({
    description: 'Role name',
    example: 'Individual Users',
  })
  role: string;

  @ApiProperty({
    description: 'Number of users with this role',
    example: 1089,
  })
  count: number;

  @ApiProperty({
    description: 'Percentage of total users',
    example: 87.3,
  })
  percentage: number;
}

export class AnalyticsDataDto {
  @ApiProperty({
    description: 'Application statistics',
    type: ApplicationDataDto,
  })
  applicationData: ApplicationDataDto;

  @ApiProperty({
    description: 'User statistics',
    type: UserStatisticsDto,
  })
  userStatistics: UserStatisticsDto;

  @ApiProperty({
    description: 'Role distribution data',
    type: [RoleDistributionDto],
  })
  roleDistribution: RoleDistributionDto[];
}

export class AnalyticsFiltersDto {
  @ApiPropertyOptional({
    description: 'Date range for analytics',
    example: { start: '2024-01-01', end: '2024-01-10' },
  })
  @IsOptional()
  dateRange?: { start: string; end: string };

  @ApiPropertyOptional({
    description: 'Country filter',
    example: 'Nigeria',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Service type filter',
    example: 'Visa Application',
  })
  @IsOptional()
  @IsString()
  serviceType?: string;
}

export class AnalyticsMetadataDto {
  @ApiProperty({
    description: 'Applied filters',
    type: AnalyticsFiltersDto,
  })
  filters: AnalyticsFiltersDto;

  @ApiProperty({
    description: 'Timestamp when analytics were generated',
    example: '2024-01-10T10:30:00Z',
  })
  generatedAt: string;
}

export class AnalyticsResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'System overview data retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Analytics data',
    type: AnalyticsDataDto,
  })
  data: AnalyticsDataDto;

  @ApiProperty({
    description: 'Response metadata',
    type: AnalyticsMetadataDto,
  })
  metadata: AnalyticsMetadataDto;
}
