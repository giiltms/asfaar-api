import { Controller, Get, Query, UseGuards, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
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
import { DashboardCenterManagerService } from './dashboard-center-manager.service';
import {
  CenterManagerStatsResponseDto,
  CalendarFiltersDto,
  CalendarSlotsResponseDto,
} from './dto/center-manager-stats.dto';
import { BaseResponseDto } from '@common/dtos/base-response.dto';

@ApiTags('Center Manager Dashboard')
@Controller('dashboard/center-manager')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardCenterManagerController {
  constructor(
    private readonly dashboardCenterManagerService: DashboardCenterManagerService,
  ) {}

  /**
   * Get user's assigned centers
   */
  @Get('my-centers')
  @Roles(UserRoles.CENTER_MANAGER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get user assigned centers',
    description:
      'Retrieve all centers that the authenticated center manager has access to',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User centers retrieved successfully',
  })
  async getUserCenters(@CurrentUser() user: JwtUserPayload) {
    const userId = user.id;
    const centers = await this.dashboardCenterManagerService.getUserCenters(
      userId,
    );

    return {
      success: true,
      data: centers,
      message: 'User centers retrieved successfully',
    };
  }

  /**
   * Get comprehensive center manager dashboard statistics
   */
  @Get('stats')
  @Roles(UserRoles.CENTER_MANAGER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get center manager dashboard statistics',
    description:
      'Retrieve comprehensive statistics for all centers managed by the center manager',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Center manager statistics retrieved successfully',
    type: CenterManagerStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      'Insufficient permissions. Only Center Manager, Admin, and Super Admin roles can access this endpoint.',
  })
  async getCenterManagerStats(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<CenterManagerStatsResponseDto>> {
    const result =
      await this.dashboardCenterManagerService.getCenterManagerStats(user.id);

    return {
      success: true,
      message: 'Center manager statistics retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get calendar slots for a date range
   */
  @Get('calendar/slots')
  @Roles(UserRoles.CENTER_MANAGER, UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get calendar slots for date range',
    description: 'Retrieve calendar slots with appointments for the specified date range',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Calendar slots retrieved successfully',
    type: CalendarSlotsResponseDto,
  })
  async getCalendarSlots(
    @Query() filters: CalendarFiltersDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<CalendarSlotsResponseDto>> {
    const result = await this.dashboardCenterManagerService.getCalendarSlots(
      user.id,
      filters,
    );

    return {
      success: true,
      message: 'Calendar slots retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
