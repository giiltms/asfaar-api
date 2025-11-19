import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { DashboardAuthorityService } from './dashboard-authority.service';
import {
  AuthorityApplicationListDto,
  AuthorityApplicationDetailDto,
  AuthorityStatsDto,
  AuthorityApplicationFiltersDto,
  AuthorityApplicationQueryDto,
} from './dto/authority-dashboard.dto';
import { BaseResponseDto } from '@common/dtos/base-response.dto';

@ApiTags('Authority Dashboard')
@Controller('dashboard/authority')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRoles.AUTHORITY)
export class DashboardAuthorityController {
  constructor(
    private readonly dashboardAuthorityService: DashboardAuthorityService,
  ) {}

  /**
   * Get all applications in the system with filtering and pagination
   */
  @Get('applications')
  @ApiOperation({
    summary: 'Get all applications in the system',
    description:
      'Retrieve all submitted applications with filtering, sorting, and pagination options',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applications retrieved successfully',
    type: AuthorityApplicationListDto,
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (asc/desc)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'countryId',
    required: false,
    description: 'Filter by country ID',
  })
  @ApiQuery({
    name: 'formType',
    required: false,
    description: 'Filter by form/visa type',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter by start date',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter by end date',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by reference number or applicant name',
  })
  async getAllApplications(
    @Query() filters: AuthorityApplicationFiltersDto,
    @Query() query: AuthorityApplicationQueryDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<AuthorityApplicationListDto>> {
    const result = await this.dashboardAuthorityService.getAllApplications(
      filters,
      query,
    );

    return {
      success: true,
      message: 'Applications retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get detailed application information
   */
  @Get('applications/:submissionId')
  @ApiOperation({
    summary: 'Get detailed application information',
    description:
      'Retrieve comprehensive details of a specific application including form responses, biometric data, and status history',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application details retrieved successfully',
    type: AuthorityApplicationDetailDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  async getApplicationDetail(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<AuthorityApplicationDetailDto>> {
    const result = await this.dashboardAuthorityService.getApplicationDetail(
      submissionId,
    );

    return {
      success: true,
      message: 'Application details retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get comprehensive analytics and statistics
   */
  @Get('analytics')
  @ApiOperation({
    summary: 'Get system analytics and statistics',
    description:
      'Retrieve comprehensive analytics including total applications, breakdowns by country, visa type, year, and revenue statistics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics retrieved successfully',
    type: AuthorityStatsDto,
  })
  async getAnalyticsStats(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<AuthorityStatsDto>> {
    const result = await this.dashboardAuthorityService.getAnalyticsStats();

    return {
      success: true,
      message: 'Analytics retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get applications by country
   */
  @Get('analytics/countries')
  @ApiOperation({
    summary: 'Get applications breakdown by country',
    description:
      'Retrieve detailed statistics of applications grouped by country',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Country statistics retrieved successfully',
  })
  async getApplicationsByCountry(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<any>> {
    const stats = await this.dashboardAuthorityService.getAnalyticsStats();

    return {
      success: true,
      message: 'Country statistics retrieved successfully',
      data: {
        applicationsByCountry: stats.applicationsByCountry,
        revenueByCountry: stats.revenue.revenueByCountry,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get applications by visa type
   */
  @Get('analytics/visa-types')
  @ApiOperation({
    summary: 'Get applications breakdown by visa type',
    description:
      'Retrieve detailed statistics of applications grouped by visa type/form type',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Visa type statistics retrieved successfully',
  })
  async getApplicationsByVisaType(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<any>> {
    const stats = await this.dashboardAuthorityService.getAnalyticsStats();

    return {
      success: true,
      message: 'Visa type statistics retrieved successfully',
      data: {
        applicationsByVisaType: stats.applicationsByVisaType,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get applications by year
   */
  @Get('analytics/years')
  @ApiOperation({
    summary: 'Get applications breakdown by year',
    description: 'Retrieve detailed statistics of applications grouped by year',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Year statistics retrieved successfully',
  })
  async getApplicationsByYear(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<any>> {
    const stats = await this.dashboardAuthorityService.getAnalyticsStats();

    return {
      success: true,
      message: 'Year statistics retrieved successfully',
      data: {
        applicationsByYear: stats.applicationsByYear,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get revenue statistics
   */
  @Get('analytics/revenue')
  @ApiOperation({
    summary: 'Get revenue statistics',
    description:
      'Retrieve comprehensive revenue statistics including total revenue, average application value, and revenue by country',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Revenue statistics retrieved successfully',
  })
  async getRevenueStats(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<any>> {
    const stats = await this.dashboardAuthorityService.getAnalyticsStats();

    return {
      success: true,
      message: 'Revenue statistics retrieved successfully',
      data: {
        revenue: stats.revenue,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
