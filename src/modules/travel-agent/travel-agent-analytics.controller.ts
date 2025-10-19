import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { TravelAgentAnalyticsService } from './travel-agent-analytics.service';
import { AgentAnalyticsDto, ClientAnalyticsDto } from './dto/travel-agent.dto';
import ApiOkBaseResponse from '@common/decorators/api-ok-base-response.decorator';
import { ApiDefaultResponse } from '@common/decorators/api-default-response.decorator';

/**
 * Controller for travel agent analytics operations
 * Provides REST API endpoints for analytics and reporting
 */
@ApiTags('Travel Agent - Analytics')
@Controller('travel-agent/analytics')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRoles.AGENCY)
@ApiBearerAuth()
export class TravelAgentAnalyticsController {
  constructor(private readonly analyticsService: TravelAgentAnalyticsService) {}

  /**
   * Get comprehensive agent analytics
   */
  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get agent analytics overview',
    description: 'Retrieve comprehensive analytics data for the travel agent.',
  })
  @ApiOkBaseResponse({ dto: AgentAnalyticsDto })
  @ApiDefaultResponse({ type: AgentAnalyticsDto })
  async getAgentAnalytics(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<AgentAnalyticsDto> {
    return this.analyticsService.getAgentAnalytics(user.id);
  }

  /**
   * Get client analytics for specific client
   */
  @Get('clients/:clientId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get client analytics',
    description: 'Retrieve analytics data for a specific client.',
  })
  @ApiOkBaseResponse({ dto: ClientAnalyticsDto })
  @ApiDefaultResponse({ type: ClientAnalyticsDto })
  async getClientAnalytics(
    @CurrentUser() user: JwtUserPayload,
    @Query('clientId') clientId: string,
  ): Promise<ClientAnalyticsDto> {
    return this.analyticsService.getClientAnalytics(user.id, clientId);
  }

  /**
   * Get top performing clients
   */
  @Get('clients/top-performing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get top performing clients',
    description:
      'Retrieve top performing clients based on success rate and revenue.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of top clients to retrieve',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Top performing clients retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Top performing clients retrieved successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              clientId: { type: 'string', example: 'uuid-string' },
              clientName: { type: 'string', example: 'John Doe' },
              totalApplications: { type: 'number', example: 5 },
              successfulApplications: { type: 'number', example: 4 },
              successRate: { type: 'number', example: 80.0 },
              totalRevenue: { type: 'number', example: 2500.0 },
              averageProcessingTime: { type: 'number', example: 6.5 },
              lastApplicationDate: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async getTopPerformingClients(
    @CurrentUser() user: JwtUserPayload,
    @Query('limit') limit?: number,
  ) {
    const clients = await this.analyticsService.getTopPerformingClients(
      user.id,
      limit || 10,
    );

    return {
      success: true,
      message: 'Top performing clients retrieved successfully',
      data: clients,
    };
  }

  /**
   * Get application trends over time
   */
  @Get('trends/applications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get application trends',
    description:
      'Retrieve application trends over time with monthly breakdown.',
  })
  @ApiQuery({
    name: 'months',
    required: false,
    description: 'Number of months to analyze',
    example: 12,
  })
  @ApiResponse({
    status: 200,
    description: 'Application trends retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Application trends retrieved successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              month: { type: 'string', example: '2024-01' },
              applications: { type: 'number', example: 8 },
              successful: { type: 'number', example: 6 },
              revenue: { type: 'number', example: 2400.0 },
            },
          },
        },
      },
    },
  })
  async getApplicationTrends(
    @CurrentUser() user: JwtUserPayload,
    @Query('months') months?: number,
  ) {
    const trends = await this.analyticsService.getApplicationTrends(
      user.id,
      months || 12,
    );

    return {
      success: true,
      message: 'Application trends retrieved successfully',
      data: trends,
    };
  }

  /**
   * Get revenue analytics
   */
  @Get('revenue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get revenue analytics',
    description:
      'Retrieve comprehensive revenue analytics for the travel agent.',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue analytics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Revenue analytics retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            totalRevenue: { type: 'number', example: 12500.0 },
            monthlyRevenue: { type: 'number', example: 2400.0 },
            averageRevenuePerClient: { type: 'number', example: 500.0 },
            revenueGrowth: { type: 'number', example: 15.5 },
          },
        },
      },
    },
  })
  async getRevenueAnalytics(@CurrentUser() user: JwtUserPayload) {
    const analytics = await this.analyticsService.getRevenueAnalytics(user.id);

    return {
      success: true,
      message: 'Revenue analytics retrieved successfully',
      data: analytics,
    };
  }

  /**
   * Get performance metrics
   */
  @Get('performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get performance metrics',
    description: 'Retrieve key performance metrics for the travel agent.',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Performance metrics retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            totalClients: { type: 'number', example: 25 },
            activeClients: { type: 'number', example: 18 },
            totalApplications: { type: 'number', example: 45 },
            successfulApplications: { type: 'number', example: 38 },
            successRate: { type: 'number', example: 84.4 },
            averageProcessingTime: { type: 'number', example: 7.2 },
            totalRevenue: { type: 'number', example: 12500.0 },
            monthlyRevenue: { type: 'number', example: 2400.0 },
            revenueGrowth: { type: 'number', example: 15.5 },
          },
        },
      },
    },
  })
  async getPerformanceMetrics(@CurrentUser() user: JwtUserPayload) {
    const [analytics, revenueAnalytics] = await Promise.all([
      this.analyticsService.getAgentAnalytics(user.id),
      this.analyticsService.getRevenueAnalytics(user.id),
    ]);

    return {
      success: true,
      message: 'Performance metrics retrieved successfully',
      data: {
        ...analytics,
        ...revenueAnalytics,
      },
    };
  }
}
