import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GatehouseApplicantDto {
  @ApiProperty({ description: 'Applicant first name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Applicant last name', example: 'Doe' })
  lastName: string;

  @ApiProperty({
    description: 'Applicant email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'Applicant phone',
    example: '+234567890123',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Applicant photo from NIN verification (base64 or URL)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
  })
  photo?: string;

  @ApiPropertyOptional({
    description: 'NIN (National Identity Number)',
    example: '12345678901',
  })
  nin?: string;
}

export class GatehouseCountryDto {
  @ApiProperty({ description: 'Country name', example: 'Saudi Arabia' })
  name: string;

  @ApiProperty({ description: '2-letter country code', example: 'SA' })
  isoCode2: string;

  @ApiProperty({ description: '3-letter country code', example: 'SAU' })
  isoCode3: string;

  @ApiPropertyOptional({ description: 'Country flag emoji', example: '🇸🇦' })
  flag?: string;
}

export class GatehouseFormDto {
  @ApiProperty({ description: 'Form ID' })
  id: string;

  @ApiProperty({
    description: 'Form name',
    example: 'Saudi Arabia Visa Application',
  })
  name: string;

  @ApiPropertyOptional({ description: 'Country information' })
  country?: GatehouseCountryDto;
}

export class GatehouseSubmissionDto {
  @ApiProperty({ description: 'Submission ID' })
  id: string;

  @ApiProperty({ description: 'Submission status', example: 'SUBMITTED' })
  status: string;

  @ApiPropertyOptional({
    description: 'Date when submitted',
    format: 'date-time',
  })
  submittedAt?: Date;

  @ApiPropertyOptional({
    description: 'Date when reviewed',
    format: 'date-time',
  })
  reviewedAt?: Date;
}

export class GatehouseCenterDto {
  @ApiProperty({ description: 'Center name', example: 'ASFAAR-ABUJA HQ' })
  name: string;

  @ApiProperty({
    description: 'Center address',
    example: '14 Yedseram Street, Maitama',
  })
  address: string;

  @ApiProperty({ description: 'Center city', example: 'Abuja' })
  city: string;

  @ApiProperty({ description: 'Center state', example: 'FCT' })
  state: string;

  @ApiPropertyOptional({
    description: 'Center phone',
    example: '+234123456789',
  })
  phone?: string;
}

export class GatehouseBoothDto {
  @ApiProperty({ description: 'Booth number', example: 'B001' })
  boothNumber: string;

  @ApiProperty({ description: 'Appointment class', example: 'REGULAR' })
  appointmentClass: string;
}

export class GatehouseAppointmentDto {
  @ApiProperty({ description: 'Appointment ID' })
  id: string;

  @ApiProperty({
    description: 'Appointment date (CRITICAL for verification)',
    format: 'date-time',
    example: '2025-01-15T00:00:00.000Z',
  })
  appointmentDate: Date;

  @ApiProperty({
    description: 'Appointment time (CRITICAL for verification)',
    format: 'date-time',
    example: '2025-01-15T09:00:00.000Z',
  })
  appointmentTime: Date;

  @ApiProperty({
    description: 'Human-readable appointment date',
    example: 'January 15, 2025',
  })
  appointmentDateFormatted: string;

  @ApiProperty({
    description: 'Human-readable appointment time',
    example: '9:00 AM',
  })
  appointmentTimeFormatted: string;

  @ApiProperty({ description: 'Appointment class', example: 'REGULAR' })
  appointmentClass: string;

  @ApiProperty({ description: 'Appointment status', example: 'CONFIRMED' })
  status: string;

  @ApiProperty({
    description: 'Whether appointment is scheduled for today',
    example: false,
  })
  isToday: boolean;

  @ApiProperty({
    description: 'Whether appointment time has passed',
    example: false,
  })
  hasTimePassed: boolean;

  @ApiProperty({
    description: 'Minutes until/since appointment (negative if passed)',
    example: 45,
  })
  minutesUntilAppointment: number;

  @ApiPropertyOptional({ description: 'Biometric center information' })
  center?: GatehouseCenterDto;

  @ApiPropertyOptional({ description: 'Assigned booth information' })
  booth?: GatehouseBoothDto;
}

export class GatehouseResponseDto {
  @ApiProperty({
    description: 'Application reference number',
    example: 'SA25001234',
  })
  referenceNumber: string;

  @ApiProperty({ description: 'Applicant basic information' })
  applicant: GatehouseApplicantDto;

  @ApiProperty({ description: 'Form information' })
  form: GatehouseFormDto;

  @ApiProperty({ description: 'Submission information' })
  submission: GatehouseSubmissionDto;

  @ApiPropertyOptional({
    description: 'Biometric appointment information with time validation',
  })
  appointment?: GatehouseAppointmentDto;
}
