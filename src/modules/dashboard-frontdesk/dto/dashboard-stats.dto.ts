import { ApiProperty } from '@nestjs/swagger';

export class QueueStatsDto {
  @ApiProperty({
    description: 'Number of applications waiting in queue',
    example: 42,
    minimum: 0,
  })
  waitingQueue: number;

  @ApiProperty({
    description: 'Number of applications currently being processed',
    example: 18,
    minimum: 0,
  })
  inProgress: number;

  @ApiProperty({
    description: 'Total applications in queue (waiting + in progress)',
    example: 60,
    minimum: 0,
  })
  totalInQueue: number;
}

export class StationStatsDto {
  @ApiProperty({
    description: 'Number of stations currently available',
    example: 7,
    minimum: 0,
  })
  availableStations: number;

  @ApiProperty({
    description: 'Number of stations currently occupied',
    example: 5,
    minimum: 0,
  })
  busyStations: number;

  @ApiProperty({
    description: 'Total number of stations',
    example: 12,
    minimum: 0,
  })
  totalStations: number;

  @ApiProperty({
    description: 'Station utilization percentage',
    example: 41.67,
    minimum: 0,
    maximum: 100,
  })
  utilizationPercentage: number;
}

export class ApplicationStatsDto {
  @ApiProperty({
    description: 'Number of new applications received today',
    example: 24,
    minimum: 0,
  })
  todayApplications: number;

  @ApiProperty({
    description: 'Number of applications completed today',
    example: 15,
    minimum: 0,
  })
  completedToday: number;

  @ApiProperty({
    description: 'Number of applications pending from previous days',
    example: 38,
    minimum: 0,
  })
  pendingFromPreviousDays: number;

  @ApiProperty({
    description: 'Total applications in system',
    example: 80,
    minimum: 0,
  })
  totalApplications: number;
}

export class ProcessingStatsDto {
  @ApiProperty({
    description: 'Average processing time in minutes',
    example: 8.5,
    minimum: 0,
  })
  avgProcessingTime: number;

  @ApiProperty({
    description: 'Fastest processing time today in minutes',
    example: 3.2,
    minimum: 0,
  })
  fastestProcessingToday: number;

  @ApiProperty({
    description: 'Slowest processing time today in minutes',
    example: 15.8,
    minimum: 0,
  })
  slowestProcessingToday: number;

  @ApiProperty({
    description: 'Total processing time today in minutes',
    example: 127.5,
    minimum: 0,
  })
  totalProcessingTimeToday: number;
}

export class AgentStatsDto {
  @ApiProperty({
    description: 'Number of active agents today',
    example: 12,
    minimum: 0,
  })
  activeAgents: number;

  @ApiProperty({
    description: 'Number of agents on break',
    example: 3,
    minimum: 0,
  })
  agentsOnBreak: number;

  @ApiProperty({
    description: 'Number of agents off duty',
    example: 2,
    minimum: 0,
  })
  agentsOffDuty: number;

  @ApiProperty({
    description: 'Total agents assigned to this station',
    example: 17,
    minimum: 0,
  })
  totalAgents: number;
}

export class FrontDeskDashboardStatsDto {
  @ApiProperty({
    description: 'Queue statistics',
    type: QueueStatsDto,
  })
  queueStats: QueueStatsDto;

  @ApiProperty({
    description: 'Station statistics',
    type: StationStatsDto,
  })
  stationStats: StationStatsDto;

  @ApiProperty({
    description: 'Application statistics',
    type: ApplicationStatsDto,
  })
  applicationStats: ApplicationStatsDto;

  @ApiProperty({
    description: 'Processing time statistics',
    type: ProcessingStatsDto,
  })
  processingStats: ProcessingStatsDto;

  @ApiProperty({
    description: 'Agent statistics',
    type: AgentStatsDto,
  })
  agentStats: AgentStatsDto;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2025-08-27T21:41:00Z',
  })
  lastUpdated: string;

  @ApiProperty({
    description: 'Station ID for this dashboard',
    example: 'station-uuid-123',
  })
  stationId: string;

  @ApiProperty({
    description: 'Station name',
    example: 'Main Reception',
  })
  stationName: string;
}

export class DashboardStatsResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Dashboard statistics data',
    type: FrontDeskDashboardStatsDto,
  })
  data: FrontDeskDashboardStatsDto;

  @ApiProperty({
    description: 'Response message',
    example: 'Dashboard statistics retrieved successfully',
  })
  message: string;
}
