import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsEmail,
  IsPhoneNumber,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dtos/pagination.dto';

// Base DTO for travel agent operations
export class TravelAgentBaseDto {
  @ApiProperty({ description: 'Travel agent ID' })
  @IsNotEmpty()
  @IsUUID()
  agentId: string;
}

// Client Management DTOs
export class CreateClientByNinDto {
  @ApiProperty({
    description: 'Client NIN (National Identity Number)',
    example: '12345678901',
  })
  @IsNotEmpty()
  @IsString()
  nin: string;

  @ApiProperty({ description: 'Client date of birth', example: '1990-01-15' })
  @IsNotEmpty()
  @IsDateString()
  dateOfBirth: string;

  @ApiPropertyOptional({ description: 'Optional notes about the client' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateClientDto {
  @ApiProperty({ description: 'Client email address' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Client phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Client first name' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiPropertyOptional({ description: 'Client middle name' })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ description: 'Client last name' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ description: 'Client date of birth' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Client gender' })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
  gender?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}

export class ClientProfileDto {
  @ApiProperty({ description: 'Client ID' })
  id: string;

  @ApiProperty({ description: 'Client email' })
  email: string;

  @ApiPropertyOptional({ description: 'Client phone' })
  phone?: string;

  @ApiProperty({ description: 'Client full name' })
  fullName: string;

  @ApiPropertyOptional({ description: 'Client avatar' })
  avatar?: string;

  @ApiProperty({ description: 'Client verification status' })
  isVerified: boolean;

  @ApiProperty({ description: 'Client creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Total applications' })
  totalApplications: number;

  @ApiProperty({ description: 'Successful applications' })
  successfulApplications: number;

  @ApiProperty({ description: 'Last application date' })
  lastApplicationDate?: Date;
}

// Application Management DTOs
export class CreateApplicationForClientDto {
  @ApiProperty({ description: 'Form ID to submit' })
  @IsNotEmpty()
  @IsUUID()
  formId: string;

  @ApiProperty({ description: 'Client ID' })
  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({ description: 'Form responses data' })
  @IsOptional()
  responses?: any;
}

export class UpdateApplicationDto {
  // Currently no fields to update - will be expanded when schema supports agent notes
}

export class ApplicationDto {
  @ApiProperty({ description: 'Application ID' })
  id: string;

  @ApiProperty({ description: 'Reference number' })
  referenceNumber?: string;

  @ApiProperty({ description: 'Form ID' })
  formId: string;

  @ApiProperty({ description: 'Form name' })
  formName: string;

  @ApiProperty({ description: 'Client ID' })
  clientId: string;

  @ApiProperty({ description: 'Client name' })
  clientName: string;

  @ApiProperty({ description: 'Application status' })
  status: string;

  @ApiProperty({ description: 'Application creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Application last update' })
  updatedAt: Date;

  @ApiProperty({ description: 'Payment status' })
  paymentStatus?: string;

  @ApiProperty({ description: 'Biometric appointment status' })
  biometricStatus?: string;
}

// Communication DTOs - TODO: Implement when ClientCommunication model is added to schema

// Analytics DTOs
export class AgentAnalyticsDto {
  @ApiProperty({ description: 'Total clients' })
  totalClients: number;

  @ApiProperty({ description: 'Active clients' })
  activeClients: number;

  @ApiProperty({ description: 'Total applications' })
  totalApplications: number;

  @ApiProperty({ description: 'Successful applications' })
  successfulApplications: number;

  @ApiProperty({ description: 'Success rate percentage' })
  successRate: number;

  @ApiProperty({ description: 'Total revenue' })
  totalRevenue: number;

  @ApiProperty({ description: 'Average processing time in days' })
  averageProcessingTime: number;

  @ApiProperty({ description: 'Applications this month' })
  applicationsThisMonth: number;

  @ApiProperty({ description: 'Revenue this month' })
  revenueThisMonth: number;
}

export class ClientAnalyticsDto {
  @ApiProperty({ description: 'Client ID' })
  clientId: string;

  @ApiProperty({ description: 'Client name' })
  clientName: string;

  @ApiProperty({ description: 'Total applications' })
  totalApplications: number;

  @ApiProperty({ description: 'Successful applications' })
  successfulApplications: number;

  @ApiProperty({ description: 'Success rate percentage' })
  successRate: number;

  @ApiProperty({ description: 'Total revenue' })
  totalRevenue: number;

  @ApiProperty({ description: 'Last application date' })
  lastApplicationDate?: Date;

  @ApiProperty({ description: 'Average processing time' })
  averageProcessingTime: number;
}

// Query DTOs
export class ClientFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search clients by name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class ApplicationFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Search by reference number, form name, or applicant details (name/email)',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by client ID' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filter by application status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by form ID' })
  @IsOptional()
  @IsUUID()
  formId?: string;

  @ApiPropertyOptional({ description: 'Date range start' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date range end' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// Communication filters - TODO: Implement when ClientCommunication model is added to schema
