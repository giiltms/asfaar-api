import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpStatus,
  ValidationPipe,
  NotFoundException,
  Request,
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
import { ApplicantDashboardService } from './applicant-dashboard.service';
import {
  ApplicationStatsDto,
  ApplicationTimelineDto,
  QuickApplicationDto,
  ApplicantDashboardDto,
  DashboardFiltersDto,
  ApplicationLogListDto,
} from './dto/applicant-dashboard.dto';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { SubmissionStatus } from '@prisma/client';

@ApiTags('Applicant Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('dashboard/applicant')
export class ApplicantDashboardController {
  constructor(private readonly dashboardService: ApplicantDashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get applicant dashboard overview',
    description:
      'Get comprehensive applicant dashboard with stats, recent applications, and action items',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applicant dashboard data retrieved successfully',
    type: ApplicantDashboardDto,
  })
  async getApplicantDashboard(
    @Request() req: any,
  ): Promise<BaseResponseDto<ApplicantDashboardDto>> {
    const userId = req.user.id;

    const dashboard = await this.dashboardService.getApplicantDashboard(userId);

    return {
      success: true,
      message: 'Applicant dashboard data retrieved successfully',
      data: dashboard,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get application statistics',
    description:
      'Get detailed statistics about user applications by status and progress',
  })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: SubmissionStatus })
  @ApiQuery({ name: 'formId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application statistics retrieved successfully',
    type: ApplicationStatsDto,
  })
  async getApplicationStats(
    @Request() req: any,
    @Query(ValidationPipe) filters: DashboardFiltersDto,
  ): Promise<BaseResponseDto<ApplicationStatsDto>> {
    const userId = req.user.id;

    const stats = await this.dashboardService.getApplicationStats(
      userId,
      filters,
    );

    return {
      success: true,
      message: 'Application statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('applications/:submissionId/timeline')
  @ApiOperation({
    summary: 'Get application timeline',
    description:
      'Get detailed timeline with stages, timestamps, and progress for specific application',
  })
  @ApiParam({ name: 'submissionId', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application timeline retrieved successfully',
    type: ApplicationTimelineDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found or not accessible to user',
  })
  async getApplicationTimeline(
    @Request() req: any,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ): Promise<BaseResponseDto<ApplicationTimelineDto>> {
    const userId = req.user.id;

    const timeline = await this.dashboardService.getApplicationTimeline(
      userId,
      submissionId,
    );

    return {
      success: true,
      message: 'Application timeline retrieved successfully',
      data: timeline,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('applications/recent')
  @ApiOperation({
    summary: 'Get recent applications',
    description: "Get user's most recent applications with basic details",
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of results (default: 5)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent applications retrieved successfully',
    type: [QuickApplicationDto],
  })
  async getRecentApplications(
    @Request() req: any,
    @Query('limit') limit?: number,
  ): Promise<BaseResponseDto<QuickApplicationDto[]>> {
    const userId = req.user.id;

    const applications = await this.dashboardService.getRecentApplications(
      userId,
      limit ? Math.min(Number(limit), 20) : 5, // Cap at 20
    );

    return {
      success: true,
      message: 'Recent applications retrieved successfully',
      data: applications,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('applications/action-required')
  @ApiOperation({
    summary: 'Get applications requiring action',
    description:
      'Get applications that require user action (drafts, payment needed, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applications requiring action retrieved successfully',
    type: [QuickApplicationDto],
  })
  async getApplicationsRequiringAction(
    @Request() req: any,
  ): Promise<BaseResponseDto<QuickApplicationDto[]>> {
    const userId = req.user.id;

    const applications =
      await this.dashboardService.getApplicationsRequiringAction(userId);

    return {
      success: true,
      message: 'Applications requiring action retrieved successfully',
      data: applications,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('appointments/upcoming')
  @ApiOperation({
    summary: 'Get upcoming appointments',
    description: "Get user's upcoming biometric appointments",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upcoming appointments retrieved successfully',
    type: [QuickApplicationDto],
  })
  async getUpcomingAppointments(
    @Request() req: any,
  ): Promise<BaseResponseDto<QuickApplicationDto[]>> {
    const userId = req.user.id;

    const appointments = await this.dashboardService.getUpcomingAppointments(
      userId,
    );

    return {
      success: true,
      message: 'Upcoming appointments retrieved successfully',
      data: appointments,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('applications/:submissionId/quick-status')
  @ApiOperation({
    summary: 'Get quick application status',
    description: 'Get summarized status for a specific application',
  })
  @ApiParam({ name: 'submissionId', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application status retrieved successfully',
    type: QuickApplicationDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found or not accessible to user',
  })
  async getQuickApplicationStatus(
    @Request() req: any,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ): Promise<BaseResponseDto<QuickApplicationDto>> {
    const userId = req.user.id;

    // Get the application
    const applications = await this.dashboardService.getRecentApplications(
      userId,
      100,
    );
    const application = applications.find((app) => app.id === submissionId);

    if (!application) {
      throw new NotFoundException('Application not found or not accessible');
    }

    return {
      success: true,
      message: 'Application status retrieved successfully',
      data: application,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get dashboard summary',
    description: 'Get key metrics and counts for dashboard widgets',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard summary retrieved successfully',
  })
  async getDashboardSummary(@Request() req: any): Promise<
    BaseResponseDto<{
      totalApplications: number;
      pendingActions: number;
      upcomingAppointments: number;
      inProgress: number;
    }>
  > {
    const userId = req.user.id;

    const [stats, actionRequired, upcomingAppointments] = await Promise.all([
      this.dashboardService.getApplicationStats(userId),
      this.dashboardService.getApplicationsRequiringAction(userId),
      this.dashboardService.getUpcomingAppointments(userId),
    ]);

    const inProgress =
      stats.submittedApplications + stats.inReviewApplications + stats.inQueue;

    return {
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data: {
        totalApplications: stats.totalApplications,
        pendingActions: actionRequired.length,
        upcomingAppointments: upcomingAppointments.length,
        inProgress,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('application-logs')
  @ApiOperation({
    summary: 'Get application logs for applicant',
    description: 'Get comprehensive application logs with timeline for all user applications',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application logs retrieved successfully',
    type: ApplicationLogListDto,
  })
  async getApplicationLogs(
    @Request() req: any,
  ): Promise<BaseResponseDto<ApplicationLogListDto>> {
    const userId = req.user.id;

    const logs = await this.dashboardService.getApplicationLogs(userId);

    return {
      success: true,
      message: 'Application logs retrieved successfully',
      data: logs,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('test')
  @ApiOperation({
    summary: 'Test user dashboard endpoints',
    description: 'Test endpoint to verify dashboard functionality',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard test successful',
  })
  async testDashboard(): Promise<BaseResponseDto<{ message: string }>> {
    return {
      success: true,
      message: 'User dashboard endpoints are working correctly',
      data: { message: 'All dashboard services operational' },
      timestamp: new Date().toISOString(),
    };
  }
}
