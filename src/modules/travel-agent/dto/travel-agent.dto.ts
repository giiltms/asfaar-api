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
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
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

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsNotEmpty({ message: 'Email is required' })
  @IsString({ message: 'Email must be a string' })
  @IsEmail(
    { allow_display_name: false, require_tld: true },
    { message: 'Email must be a valid email address' },
  )
  @ApiProperty({
    description: 'Client email address',
    example: 'john.doe@example.com',
  })
  email: string;

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

  @ApiPropertyOptional({ description: 'Client first name' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Client last name' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Client middle name' })
  middleName?: string;

  @ApiPropertyOptional({ description: 'Client avatar' })
  avatar?: string;

  @ApiProperty({ description: 'Client verification status' })
  isVerified: boolean;

  @ApiPropertyOptional({ description: 'Client date of birth' })
  dateOfBirth?: Date;

  @ApiPropertyOptional({
    description: 'Client gender',
    enum: ['MALE', 'FEMALE', 'OTHER'],
  })
  gender?: string;

  @ApiProperty({ description: 'Client creation date' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Client last update date' })
  updatedAt?: Date;

  @ApiProperty({ description: 'Total applications' })
  totalApplications: number;

  @ApiProperty({ description: 'Successful applications' })
  successfulApplications: number;

  @ApiProperty({ description: 'Last application date' })
  lastApplicationDate?: Date;

  @ApiPropertyOptional({ description: 'National Identity Number' })
  nin?: string;

  @ApiPropertyOptional({ description: 'NIN verification status' })
  ninVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Current/latest verified NIN verification details',
    type: 'object',
  })
  currentNinVerification?: any;

  // Agent-specific fields (not in /me endpoint)
  @ApiPropertyOptional({ description: 'When client was added to agent list' })
  addedAt?: Date;

  @ApiPropertyOptional({ description: 'Notes about the client relationship' })
  relationshipNotes?: string;
}

// Application Management DTOs (deprecated - use POST /submissions with optional clientId)

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

// Calendar DTOs
export class AgentCalendarFiltersDto {
  @ApiProperty({
    description: 'Start date for the calendar view (ISO date string)',
    example: '2024-01-15',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for the calendar view (ISO date string)',
    example: '2024-01-20',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Filter by specific client ID',
    example: 'client-uuid-123',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Filter by appointment class',
    enum: ['REGULAR', 'VIP', 'PREMIUM'],
    example: 'REGULAR',
  })
  @IsOptional()
  @IsEnum(['REGULAR', 'VIP', 'PREMIUM'])
  appointmentClass?: string;

  @ApiPropertyOptional({
    description: 'Filter by appointment status',
    enum: [
      'PENDING',
      'SCHEDULED',
      'ACTIVE',
      'CHECKED_IN',
      'IN_QUEUE',
      'AT_BOOTH',
      'COMPLETED',
      'CANCELLED',
      'RESCHEDULED',
      'NO_SHOW',
    ],
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum([
    'PENDING',
    'SCHEDULED',
    'ACTIVE',
    'CHECKED_IN',
    'IN_QUEUE',
    'AT_BOOTH',
    'COMPLETED',
    'CANCELLED',
    'RESCHEDULED',
    'NO_SHOW',
  ])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by biometric center ID',
    example: 'center-uuid-123',
  })
  @IsOptional()
  @IsUUID()
  centerId?: string;
}

export class AgentCalendarAppointmentDto {
  @ApiProperty({ description: 'Appointment ID', example: 'apt-123' })
  id: string;

  @ApiPropertyOptional({
    description: 'Appointment time (nullable if not scheduled)',
    example: '2024-01-15T09:00:00Z',
  })
  appointmentTime: Date | null;

  @ApiProperty({
    description: 'Appointment status',
    enum: [
      'PENDING',
      'SCHEDULED',
      'ACTIVE',
      'CHECKED_IN',
      'IN_QUEUE',
      'AT_BOOTH',
      'COMPLETED',
      'CANCELLED',
      'RESCHEDULED',
      'NO_SHOW',
    ],
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'Appointment class',
    enum: ['REGULAR', 'VIP', 'PREMIUM'],
    example: 'REGULAR',
  })
  appointmentClass: string;

  @ApiProperty({ description: 'Client information' })
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
  };

  @ApiProperty({ description: 'Submission information' })
  submission: {
    id: string;
    referenceNumber: string;
    formName: string;
    country: string;
  };

  @ApiPropertyOptional({ description: 'Biometric center information' })
  center?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional({ description: 'Booth information' })
  booth?: {
    id: string;
    boothNumber: string;
  };
}

export class AgentCalendarResponseDto {
  @ApiProperty({
    description: 'Calendar appointments',
    type: [AgentCalendarAppointmentDto],
  })
  appointments: AgentCalendarAppointmentDto[];

  @ApiProperty({ description: 'Total appointments count', example: 25 })
  totalAppointments: number;

  @ApiProperty({
    description: 'Date range',
    example: '2024-01-15 to 2024-01-20',
  })
  dateRange: string;
}
