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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Dashboard data retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            analytics: {
              type: 'object',
              properties: {
                totalClients: { type: 'number', example: 25 },
                activeClients: { type: 'number', example: 18 },
                totalApplications: { type: 'number', example: 45 },
                successfulApplications: { type: 'number', example: 38 },
                successRate: { type: 'number', example: 84.4 },
                totalRevenue: { type: 'number', example: 12500.0 },
                averageProcessingTime: { type: 'number', example: 7.2 },
                applicationsThisMonth: { type: 'number', example: 8 },
                revenueThisMonth: { type: 'number', example: 2400.0 },
              },
            },
            recentApplications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid-string' },
                  referenceNumber: { type: 'string', example: 'APP-2024-001' },
                  formName: { type: 'string', example: 'Visa Application' },
                  clientName: { type: 'string', example: 'John Doe' },
                  status: { type: 'string', example: 'SUBMITTED' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            recentCommunications: {
              type: 'array',
              items: { type: 'object' },
              example: [],
            },
          },
        },
      },
    },
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
    name: 'search',
    required: false,
    description:
      'Search by reference number, form name, or applicant details (name/email)',
    example: 'john.doe@example.com',
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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Applications retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid-string' },
                  referenceNumber: { type: 'string', example: 'APP-2024-001' },
                  formId: { type: 'string', example: 'uuid-string' },
                  formName: { type: 'string', example: 'Visa Application' },
                  clientId: { type: 'string', example: 'uuid-string' },
                  clientName: { type: 'string', example: 'John Doe' },
                  status: { type: 'string', example: 'SUBMITTED' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                  paymentStatus: { type: 'string', example: 'COMPLETED' },
                  biometricStatus: { type: 'string', example: 'SCHEDULED' },
                },
              },
            },
            total: { type: 'number', example: 45 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
          },
        },
      },
    },
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
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Recent applications retrieved successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid-string' },
              referenceNumber: { type: 'string', example: 'APP-2024-001' },
              formId: { type: 'string', example: 'uuid-string' },
              formName: { type: 'string', example: 'Visa Application' },
              clientId: { type: 'string', example: 'uuid-string' },
              clientName: { type: 'string', example: 'John Doe' },
              status: { type: 'string', example: 'SUBMITTED' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              paymentStatus: { type: 'string', example: 'COMPLETED' },
              biometricStatus: { type: 'string', example: 'SCHEDULED' },
            },
          },
        },
      },
    },
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
