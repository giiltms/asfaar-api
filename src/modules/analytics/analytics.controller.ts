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
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResponseDto, AnalyticsFiltersDto } from './dto/analytics.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles(UserRoles.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get system overview analytics',
    description:
      'Retrieve comprehensive system analytics including application data, user statistics, and role distribution. Super admin only.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for analytics (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for analytics (YYYY-MM-DD)',
    example: '2024-01-10',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Filter by country',
    example: 'Nigeria',
  })
  @ApiQuery({
    name: 'serviceType',
    required: false,
    description: 'Filter by service type',
    example: 'Visa Application',
  })
  @ApiResponse({
    status: 200,
    description: 'System overview analytics retrieved successfully',
    type: AnalyticsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super admin access required',
  })
  async getSystemOverview(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('country') country?: string,
    @Query('serviceType') serviceType?: string,
  ): Promise<AnalyticsResponseDto> {
    const filters: AnalyticsFiltersDto = {};

    if (startDate && endDate) {
      filters.dateRange = { start: startDate, end: endDate };
    }

    if (country) {
      filters.country = country;
    }

    if (serviceType) {
      filters.serviceType = serviceType;
    }

    const result = await this.analyticsService.getSystemOverview(filters);

    return {
      success: true,
      message: 'System overview data retrieved successfully',
      data: result.data,
      metadata: result.metadata,
    };
  }
}
