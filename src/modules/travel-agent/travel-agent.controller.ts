import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
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
import { TravelAgentService } from './travel-agent.service';
import {
  CreateApplicationForClientDto,
  UpdateApplicationDto,
  ApplicationDto,
  ApplicationFiltersDto,
  AgentAnalyticsDto,
} from './dto/travel-agent.dto';
import ApiOkBaseResponse from '@common/decorators/api-ok-base-response.decorator';
import { ApiDefaultResponse } from '@common/decorators/api-default-response.decorator';

/**
 * Controller for travel agent operations
 * Provides REST API endpoints for travel agent functionality
 */
@ApiTags('Travel Agent')
@Controller('travel-agent')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRoles.AGENCY)
@ApiBearerAuth()
export class TravelAgentController {
  constructor(private readonly travelAgentService: TravelAgentService) {}

  /**
   * Get travel agent dashboard
   */
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get travel agent dashboard',
    description:
      'Retrieve comprehensive dashboard data including analytics, recent applications, and communications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Agency role required',
  })
  async getDashboard(@CurrentUser() user: JwtUserPayload) {
    const dashboard = await this.travelAgentService.getAgentDashboard(user.id);

    return {
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: dashboard,
    };
  }

  /**
   * Get travel agent analytics
   */
  @Get('analytics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get travel agent analytics',
    description: 'Retrieve comprehensive analytics data for the travel agent.',
  })
  @ApiOkBaseResponse({ dto: AgentAnalyticsDto })
  @ApiDefaultResponse({ type: AgentAnalyticsDto })
  async getAnalytics(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<AgentAnalyticsDto> {
    return this.travelAgentService.getAgentAnalytics(user.id);
  }

  /**
   * Create application for client
   */
  @Post('applications')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create application for client',
    description: 'Create a new application on behalf of a client.',
  })
  @ApiOkBaseResponse({ dto: ApplicationDto })
  @ApiDefaultResponse({ type: ApplicationDto })
  async createApplicationForClient(
    @CurrentUser() user: JwtUserPayload,
    @Body(ValidationPipe) createDto: CreateApplicationForClientDto,
  ): Promise<ApplicationDto> {
    return this.travelAgentService.createApplicationForClient(
      user.id,
      createDto,
    );
  }

  /**
   * Update application
   */
  @Put('applications/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update application',
    description:
      'Update an existing application with agent notes and priority.',
  })
  @ApiParam({
    name: 'id',
    description: 'Application ID',
    example: 'uuid-string',
  })
  @ApiOkBaseResponse({ dto: ApplicationDto })
  @ApiDefaultResponse({ type: ApplicationDto })
  async updateApplication(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') applicationId: string,
    @Body(ValidationPipe) updateDto: UpdateApplicationDto,
  ): Promise<ApplicationDto> {
    return this.travelAgentService.updateApplication(
      user.id,
      applicationId,
      updateDto,
    );
  }

  /**
   * Get applications with filters
   */
  @Get('applications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get applications with filters',
    description:
      'Retrieve applications with optional filtering and pagination.',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    description: 'Filter by client ID',
    example: 'uuid-string',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by application status',
    example: 'SUBMITTED',
  })
  @ApiQuery({
    name: 'formId',
    required: false,
    description: 'Filter by form ID',
    example: 'uuid-string',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by end date (YYYY-MM-DD)',
    example: '2024-01-31',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Applications retrieved successfully',
  })
  async getApplications(
    @CurrentUser() user: JwtUserPayload,
    @Query(ValidationPipe) filters: ApplicationFiltersDto,
  ) {
    const result = await this.travelAgentService.getApplications(
      user.id,
      filters,
    );

    return {
      success: true,
      message: 'Applications retrieved successfully',
      data: result,
    };
  }

  /**
   * Get recent applications
   */
  @Get('applications/recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get recent applications',
    description: 'Retrieve recent applications for the travel agent.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of recent applications to retrieve',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent applications retrieved successfully',
  })
  async getRecentApplications(
    @CurrentUser() user: JwtUserPayload,
    @Query('limit') limit?: number,
  ) {
    const applications = await this.travelAgentService.getRecentApplications(
      user.id,
      limit || 10,
    );

    return {
      success: true,
      message: 'Recent applications retrieved successfully',
      data: applications,
    };
  }
}
