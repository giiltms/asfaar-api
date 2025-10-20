import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import { Roles } from '@common/decorators/roles.decorator';
import { CurrentUser, JwtUserPayload } from '@common/decorators/current-user.decorator';
import { TravelAgentUpgradeService } from './travel-agent-upgrade.service';

@ApiTags('Admin - Travel Agent Upgrade')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
@Controller('admin/travel-agent/upgrade')
export class AdminTravelAgentUpgradeController {
  constructor(private readonly service: TravelAgentUpgradeService) {}

  @Get('applications')
  @ApiOperation({ summary: 'List upgrade applications' })
  async list(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.listApplications({ status, page: Number(page), limit: Number(limit) });
  }

  @Post('applications/:id/approve')
  @ApiOperation({ summary: 'Approve an upgrade application and issue license' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() admin: JwtUserPayload,
    @Body() body: { reviewNotes?: string },
  ) {
    return this.service.approveApplication(admin.id, id, body?.reviewNotes);
  }

  @Post('applications/:id/reject')
  @ApiOperation({ summary: 'Reject an upgrade application' })
  async reject(
    @Param('id') id: string,
    @CurrentUser() admin: JwtUserPayload,
    @Body() body: { rejectionReason?: string; reviewNotes?: string },
  ) {
    return this.service.rejectApplication(
      admin.id,
      id,
      body?.rejectionReason,
      body?.reviewNotes,
    );
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get a single upgrade application' })
  async getOne(@Param('id') id: string) {
    return this.service.getApplicationById(id);
  }

  @Put('applications/:id/review')
  @ApiOperation({ summary: 'Mark application as UNDER_REVIEW / assign reviewer' })
  async toReview(
    @Param('id') id: string,
    @CurrentUser() reviewer: JwtUserPayload,
    @Body() body: { reviewNotes?: string },
  ) {
    return this.service.markUnderReview(id, reviewer.id, body?.reviewNotes);
  }
}
