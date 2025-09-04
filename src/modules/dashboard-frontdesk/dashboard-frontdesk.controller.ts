import {
  Controller,
  Get,
  Param,
  Query,
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
  ApplicantListResponseDto,
  ApplicantListFiltersDto,
  ApplicantDetailDto,
} from './dto/dashboard-stats.dto';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
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
   * Get user's assigned centers
   */
  @Get('my-centers')
  @ApiOperation({
    summary: 'Get user assigned centers',
    description:
      'Retrieve all centers that the authenticated user has access to',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User centers retrieved successfully',
    type: [Object],
  })
  @ApiDefaultResponse({})
  async getUserCenters(@CurrentUser() user: JwtUserPayload) {
    const userId = user.id;
    const centers = await this.dashboardFrontdeskService.getUserCenters(userId);

    return {
      success: true,
      data: centers,
      message: 'User centers retrieved successfully',
    };
  }

  /**
   * Get comprehensive front desk dashboard statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get front desk dashboard statistics',
    description:
      'Retrieve comprehensive statistics for the front desk dashboard including queue, station, application, processing, and agent metrics for all user assigned centers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiDefaultResponse({})
  async getFrontDeskDashboardStats(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<DashboardStatsResponseDto> {
    const userId = user.id;
    const stats =
      await this.dashboardFrontdeskService.getFrontDeskDashboardStats(userId);

    return {
      success: true,
      data: stats,
      message: 'Dashboard statistics retrieved successfully',
    };
  }

  /**
   * Get real-time queue updates
   */
  @Get('queue-updates')
  @ApiOperation({
    summary: 'Get real-time queue updates',
    description:
      'Retrieve real-time updates for queue statistics and station status for all user assigned centers. Useful for WebSocket or Server-Sent Events.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue updates retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getQueueUpdates(@CurrentUser() user: JwtUserPayload) {
    const userId = user.id;
    const userCenters = await this.dashboardFrontdeskService.getUserCenters(
      userId,
    );
    const centerIds = userCenters.map((center) => center.id);
    const updates = await this.dashboardFrontdeskService.getQueueUpdates(
      centerIds,
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
  @Get('metrics')
  @ApiOperation({
    summary: 'Get station-specific metrics',
    description:
      'Retrieve station-specific metrics including efficiency score and performance indicators for all user assigned centers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Station metrics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getStationMetrics(@CurrentUser() user: JwtUserPayload) {
    const userId = user.id;
    const userCenters = await this.dashboardFrontdeskService.getUserCenters(
      userId,
    );
    const centerIds = userCenters.map((center) => center.id);
    const metrics = await this.dashboardFrontdeskService.getStationMetrics(
      centerIds,
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
  @Get('queue-stats')
  @ApiOperation({
    summary: 'Get queue statistics',
    description:
      'Retrieve only queue-related statistics for all user assigned centers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue statistics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getQueueStats(@CurrentUser() user: JwtUserPayload) {
    const userId = user.id;
    const userCenters = await this.dashboardFrontdeskService.getUserCenters(
      userId,
    );
    const centerIds = userCenters.map((center) => center.id);
    const queueStats = await this.dashboardFrontdeskService.getQueueStats(
      centerIds,
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
  @Get('station-stats')
  @ApiOperation({
    summary: 'Get station statistics',
    description:
      'Retrieve only station-related statistics for all user assigned centers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Station statistics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getStationStats(@CurrentUser() user: JwtUserPayload) {
    const userId = user.id;
    const userCenters = await this.dashboardFrontdeskService.getUserCenters(
      userId,
    );
    const centerIds = userCenters.map((center) => center.id);
    const stationStats = await this.dashboardFrontdeskService.getStationStats(
      centerIds,
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
  @Get('application-stats')
  @ApiOperation({
    summary: 'Get application statistics',
    description:
      'Retrieve only application-related statistics for all user assigned centers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application statistics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getApplicationStats(@CurrentUser() user: JwtUserPayload) {
    const userId = user.id;
    const userCenters = await this.dashboardFrontdeskService.getUserCenters(
      userId,
    );
    const centerIds = userCenters.map((center) => center.id);
    const applicationStats =
      await this.dashboardFrontdeskService.getApplicationStats(centerIds);

    return {
      success: true,
      data: applicationStats,
      message: 'Application statistics retrieved successfully',
    };
  }

  /**
   * Get processing statistics only
   */
  @Get('processing-stats')
  @ApiOperation({
    summary: 'Get processing statistics',
    description:
      'Retrieve only processing time-related statistics for all user assigned centers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Processing statistics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getProcessingStats(@CurrentUser() user: JwtUserPayload) {
    const userId = user.id;
    const userCenters = await this.dashboardFrontdeskService.getUserCenters(
      userId,
    );
    const centerIds = userCenters.map((center) => center.id);
    const processingStats =
      await this.dashboardFrontdeskService.getProcessingStats(centerIds);

    return {
      success: true,
      data: processingStats,
      message: 'Processing statistics retrieved successfully',
    };
  }

  /**
   * Get agent statistics only
   */
  @Get('agent-stats')
  @ApiOperation({
    summary: 'Get agent statistics',
    description:
      'Retrieve only agent-related statistics for all user assigned centers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent statistics retrieved successfully',
  })
  @ApiDefaultResponse({})
  async getAgentStats(@CurrentUser() user: JwtUserPayload) {
    const userId = user.id;
    const userCenters = await this.dashboardFrontdeskService.getUserCenters(
      userId,
    );
    const centerIds = userCenters.map((center) => center.id);
    const agentStats = await this.dashboardFrontdeskService.getAgentStats(
      centerIds,
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

  /**
   * Get list of applicants for the front desk
   */
  @Get('applicants')
  @ApiOperation({
    summary: 'Get list of applicants',
    description:
      'Retrieve a paginated list of applicants for the front desk with filtering and search capabilities for all user assigned centers.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by application status',
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'applicationType',
    required: false,
    description: 'Filter by application type',
    example: 'VISA_APPLICATION',
  })
  @ApiQuery({
    name: 'paymentStatus',
    required: false,
    description: 'Filter by payment status',
    example: 'PAID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by applicant name or email',
    example: 'john',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Filter by submission date (from)',
    example: '2025-08-01',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    description: 'Filter by submission date (to)',
    example: '2025-08-29',
  })
  @ApiQuery({
    name: 'inQueue',
    required: false,
    description: 'Filter by queue status',
    example: true,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applicants retrieved successfully',
    type: ApplicantListResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiDefaultResponse({})
  async getApplicants(
    @CurrentUser() user: JwtUserPayload,
    @Query() filters: ApplicantListFiltersDto,
  ): Promise<ApplicantListResponseDto> {
    const userId = user.id;
    const userCenters = await this.dashboardFrontdeskService.getUserCenters(
      userId,
    );
    const centerIds = userCenters.map((center) => center.id);
    const result = await this.dashboardFrontdeskService.getApplicants(
      centerIds,
      filters,
    );

    return {
      success: true,
      data: result.applicants,
      pagination: result.pagination,
      message: 'Applicants retrieved successfully',
    };
  }

  /**
   * Get detailed information about a specific applicant
   */
  @Get('applicants/:applicantId')
  @ApiOperation({
    summary: 'Get applicant details',
    description:
      'Retrieve detailed information about a specific applicant including form data, payment details, and timeline.',
  })
  @ApiParam({
    name: 'applicantId',
    description: 'Applicant ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applicant details retrieved successfully',
    type: ApplicantDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Applicant not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiDefaultResponse({})
  async getApplicantDetail(
    @CurrentUser() user: JwtUserPayload,
    @Param('applicantId', ParseUUIDPipe) applicantId: string,
  ): Promise<{ success: boolean; data: ApplicantDetailDto; message: string }> {
    const userId = user.id;
    const userCenters = await this.dashboardFrontdeskService.getUserCenters(
      userId,
    );
    const centerIds = userCenters.map((center) => center.id);
    const applicant = await this.dashboardFrontdeskService.getApplicantDetail(
      centerIds,
      applicantId,
    );

    return {
      success: true,
      data: applicant,
      message: 'Applicant details retrieved successfully',
    };
  }
}
