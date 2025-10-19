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
