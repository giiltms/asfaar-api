import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardFrontdeskService } from './dashboard-frontdesk.service';
import {
  DashboardStatsResponseDto,
  FrontDeskDashboardStatsDto,
} from './dto/dashboard-stats.dto';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { ApiDefaultResponse } from '@common/decorators/api-default-response.decorator';

/**
 * Controller for front desk dashboard operations
 * Provides endpoints for receptionists to view station statistics and queue information
 */
@ApiTags('Front Desk Dashboard')
@Controller('dashboard-frontdesk')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class DashboardFrontdeskController {
  constructor(
    private readonly dashboardFrontdeskService: DashboardFrontdeskService,
  ) {}

  /**
   * Get comprehensive front desk dashboard statistics
   */
  @Get(':stationId/stats')
  @ApiOperation({
    summary: 'Get front desk dashboard statistics',
    description:
      'Retrieve comprehensive statistics for the front desk dashboard including queue, station, application, processing, and agent metrics.',
  })
  @ApiParam({
    name: 'stationId',
    description: 'Biometric center/station ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Station not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiDefaultResponse({})
  async getFrontDeskDashboardStats(
    @Request() req: any,
    @Param('stationId', ParseUUIDPipe) stationId: string,
  ): Promise<DashboardStatsResponseDto> {
    const stats =
      await this.dashboardFrontdeskService.getFrontDeskDashboardStats(
        stationId,
      );

    return {
      success: true,
      data: stats,
      message: 'Dashboard statistics retrieved successfully',
    };
  }

  /**
   * Get real-time queue updates
   */
  @Get(':stationId/queue-updates')
  @ApiOperation({
    summary: 'Get real-time queue updates',
    description:
      'Retrieve real-time updates for queue statistics and station status. Useful for WebSocket or Server-Sent Events.',
  })
  @ApiParam({
    name: 'stationId',
    description: 'Biometric center/station ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue updates retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getQueueUpdates(
    @Request() req: any,
    @Param('stationId', ParseUUIDPipe) stationId: string,
  ) {
    const updates = await this.dashboardFrontdeskService.getQueueUpdates(
      stationId,
    );

    return {
      success: true,
      data: updates,
      message: 'Queue updates retrieved successfully',
    };
  }

  /**
   * Get station-specific metrics
   */
  @Get(':stationId/metrics')
  @ApiOperation({
    summary: 'Get station-specific metrics',
    description:
      'Retrieve station-specific metrics including efficiency score and performance indicators.',
  })
  @ApiParam({
    name: 'stationId',
    description: 'Biometric center/station ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Station metrics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getStationMetrics(
    @Request() req: any,
    @Param('stationId', ParseUUIDPipe) stationId: string,
  ) {
    const metrics = await this.dashboardFrontdeskService.getStationMetrics(
      stationId,
    );

    return {
      success: true,
      data: metrics,
      message: 'Station metrics retrieved successfully',
    };
  }

  /**
   * Get queue statistics only
   */
  @Get(':stationId/queue-stats')
  @ApiOperation({
    summary: 'Get queue statistics',
    description: 'Retrieve only queue-related statistics for the station.',
  })
  @ApiParam({
    name: 'stationId',
    description: 'Biometric center/station ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue statistics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getQueueStats(
    @Request() req: any,
    @Param('stationId', ParseUUIDPipe) stationId: string,
  ) {
    const queueStats = await this.dashboardFrontdeskService.getQueueStats(
      stationId,
    );

    return {
      success: true,
      data: queueStats,
      message: 'Queue statistics retrieved successfully',
    };
  }

  /**
   * Get station statistics only
   */
  @Get(':stationId/station-stats')
  @ApiOperation({
    summary: 'Get station statistics',
    description: 'Retrieve only station-related statistics.',
  })
  @ApiParam({
    name: 'stationId',
    description: 'Biometric center/station ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Station statistics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getStationStats(
    @Request() req: any,
    @Param('stationId', ParseUUIDPipe) stationId: string,
  ) {
    const stationStats = await this.dashboardFrontdeskService.getStationStats(
      stationId,
    );

    return {
      success: true,
      data: stationStats,
      message: 'Station statistics retrieved successfully',
    };
  }

  /**
   * Get application statistics only
   */
  @Get(':stationId/application-stats')
  @ApiOperation({
    summary: 'Get application statistics',
    description: 'Retrieve only application-related statistics.',
  })
  @ApiParam({
    name: 'stationId',
    description: 'Biometric center/station ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application statistics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getApplicationStats(
    @Request() req: any,
    @Param('stationId', ParseUUIDPipe) stationId: string,
  ) {
    // We'll need to make this method public in the service
    const applicationStats =
      await this.dashboardFrontdeskService.getApplicationStats(stationId);

    return {
      success: true,
      data: applicationStats,
      message: 'Application statistics retrieved successfully',
    };
  }

  /**
   * Get processing statistics only
   */
  @Get(':stationId/processing-stats')
  @ApiOperation({
    summary: 'Get processing statistics',
    description: 'Retrieve only processing time-related statistics.',
  })
  @ApiParam({
    name: 'stationId',
    description: 'Biometric center/station ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Processing statistics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getProcessingStats(
    @Request() req: any,
    @Param('stationId', ParseUUIDPipe) stationId: string,
  ) {
    const processingStats =
      await this.dashboardFrontdeskService.getProcessingStats(stationId);

    return {
      success: true,
      data: processingStats,
      message: 'Processing statistics retrieved successfully',
    };
  }

  /**
   * Get agent statistics only
   */
  @Get(':stationId/agent-stats')
  @ApiOperation({
    summary: 'Get agent statistics',
    description: 'Retrieve only agent-related statistics.',
  })
  @ApiParam({
    name: 'stationId',
    description: 'Biometric center/station ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent statistics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getAgentStats(
    @Request() req: any,
    @Param('stationId', ParseUUIDPipe) stationId: string,
  ) {
    const agentStats = await this.dashboardFrontdeskService.getAgentStats(
      stationId,
    );

    return {
      success: true,
      data: agentStats,
      message: 'Agent statistics retrieved successfully',
    };
  }

  /**
   * Health check endpoint for the dashboard
   */
  @Get('health')
  @ApiOperation({
    summary: 'Dashboard health check',
    description: 'Check if the dashboard service is running properly.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard service is healthy',
  })
  async healthCheck() {
    return {
      success: true,
      message: 'Front Desk Dashboard service is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
