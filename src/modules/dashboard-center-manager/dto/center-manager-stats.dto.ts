import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
