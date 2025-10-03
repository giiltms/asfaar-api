import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';

export class StationStatsDto {
  @ApiProperty({ description: 'Number of active stations', example: 2 })
  activeStations: number;

  @ApiProperty({ description: 'Total number of stations', example: 8 })
  totalStations: number;

  @ApiProperty({
    description: 'Number of completed captures today',
    example: 1,
  })
  completedToday: number;

  @ApiProperty({
    description: 'Number of captures currently in progress',
    example: 1,
  })
  inProgressCount: number;

  @ApiProperty({ description: 'Number of available agents', example: 6 })
  availableAgents: number;

  @ApiProperty({
    description: 'Number of people currently in queue',
    example: 3,
  })
  queueLength: number;

  @ApiProperty({
    description: 'Number of completed captures yesterday',
    example: 5,
  })
  completedYesterday: number;

  @ApiProperty({
    description: 'Number of completed captures this week',
    example: 25,
  })
  completedThisWeek: number;

  @ApiProperty({
    description: 'Number of completed captures this month',
    example: 100,
  })
  completedThisMonth: number;

  @ApiProperty({ description: 'Number of no-shows today', example: 2 })
  noShowsToday: number;

  @ApiProperty({
    description: 'Number of rescheduled appointments today',
    example: 1,
  })
  rescheduledToday: number;

  @ApiProperty({
    description: 'Number of available appointment slots today',
    example: 15,
  })
  availableSlots: number;

  @ApiProperty({
    description: 'Number of appointments scheduled for tomorrow',
    example: 12,
  })
  tomorrowBookings: number;

  @ApiProperty({
    description: 'Number of agents currently offline',
    example: 2,
  })
  agentsOffline: number;

  @ApiPropertyOptional({
    description: 'Average wait time in minutes',
    example: 15,
  })
  averageWaitTime?: number;

  @ApiPropertyOptional({
    description: 'Longest current wait time in minutes',
    example: 25,
  })
  longestWaitTime?: number;
}

export class CenterManagerStatsResponseDto {
  @ApiProperty({ description: 'Station statistics', type: StationStatsDto })
  stats: StationStatsDto;

  @ApiProperty({ description: 'Centers managed by this user', type: [Object] })
  centers: any[];
}

// Calendar DTOs
export enum CalendarViewType {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class CalendarFiltersDto {
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

  @ApiProperty({
    description: 'Calendar view type',
    enum: CalendarViewType,
    example: CalendarViewType.WEEK,
  })
  @IsEnum(CalendarViewType)
  viewType: CalendarViewType;

  @ApiPropertyOptional({
    description: 'Filter by specific center ID',
    example: 'center-uuid-123',
  })
  @IsOptional()
  @IsUUID()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by appointment class',
    enum: ['REGULAR', 'VIP', 'PREMIUM'],
    example: 'VIP',
  })
  @IsOptional()
  @IsEnum(['REGULAR', 'VIP', 'PREMIUM'])
  appointmentClass?: string;

  @ApiPropertyOptional({
    description: 'Filter by appointment status',
    enum: [
      'PENDING',
      'ACTIVE',
      'CHECKED_IN',
      'IN_QUEUE',
      'AT_BOOTH',
      'COMPLETED',
    ],
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum([
    'PENDING',
    'ACTIVE',
    'CHECKED_IN',
    'IN_QUEUE',
    'AT_BOOTH',
    'COMPLETED',
  ])
  status?: string;
}

export class CalendarSlotDto {
  @ApiProperty({ description: 'Slot ID', example: 'slot-123' })
  id: string;

  @ApiProperty({ description: 'Start time', example: '09:00' })
  startTime: string;

  @ApiProperty({ description: 'End time', example: '09:30' })
  endTime: string;

  @ApiProperty({ description: 'Date', example: '2024-01-15' })
  date: string;

  @ApiProperty({
    description: 'Slot status',
    enum: ['AVAILABLE', 'BOOKED', 'BLOCKED'],
    example: 'BOOKED',
  })
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED';

  @ApiPropertyOptional({ description: 'Appointment details if slot is booked' })
  appointment?: {
    id: string;
    referenceNumber: string;
    applicantName: string;
    country: string;
    formType: string;
    appointmentClass: string;
    boothNumber: string;
    agentName: string;
    status: string;
    appointmentId: string;
    submissionId: string;
  };
}

export class CalendarSlotsResponseDto {
  @ApiProperty({ description: 'Calendar slots', type: [CalendarSlotDto] })
  slots: CalendarSlotDto[];

  @ApiProperty({ description: 'Total slots count', example: 48 })
  totalSlots: number;

  @ApiProperty({ description: 'Available slots count', example: 12 })
  availableSlots: number;

  @ApiProperty({ description: 'Booked slots count', example: 36 })
  bookedSlots: number;

  @ApiProperty({
    description: 'Date range',
    example: '2024-01-15 to 2024-01-20',
  })
  dateRange: string;

  @ApiProperty({ description: 'View type', example: 'week' })
  viewType: string;
}
