import { Controller, Get, Query, HttpStatus, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { BiometricCaptureService } from '@modules/biometric-capture/services/biometric-capture.service';
import {
  OfficerStatsDto,
  CaptureHistoryResponseDto,
} from '@modules/biometric-capture/biometric-capture.controller';

@ApiTags('Biometric Officer Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('dashboard/biometric')
export class DashboardBiometricController {
  constructor(private readonly biometricService: BiometricCaptureService) {}

  @Get('stats')
  @Roles(
    UserRoles.BIOMETRIC_AGENT,
    UserRoles.CENTER_MANAGER,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get biometric officer statistics' })
  @ApiResponse({ status: HttpStatus.OK, type: OfficerStatsDto })
  async getStats(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<OfficerStatsDto> {
    return this.biometricService.getOfficerStats(user.id);
  }

  @Get('history')
  @Roles(
    UserRoles.BIOMETRIC_AGENT,
    UserRoles.CENTER_MANAGER,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get biometric officer capture history' })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: CaptureHistoryResponseDto })
  async getHistory(
    @CurrentUser() user: JwtUserPayload,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ): Promise<CaptureHistoryResponseDto> {
    return this.biometricService.getOfficerHistory(user.id, {
      fromDate,
      toDate,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }
}
