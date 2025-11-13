import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { DashboardLiaisonService } from './dashboard-liaison.service';
import {
  ApplicationReviewDto,
  LiaisonReviewListDto,
  LiaisonStatsDto,
  LiaisonActionDto,
  LiaisonReviewFiltersDto,
  LiaisonActionResponseDto,
  LiaisonHistoryDto,
  LiaisonHistoryQueryDto,
} from './dto/liaison-review.dto';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { SubmissionStatus } from '@prisma/client';

@ApiTags('Liaison Officer Dashboard')
@Controller('dashboard/liaison')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class DashboardLiaisonController {
  constructor(
    private readonly dashboardLiaisonService: DashboardLiaisonService,
  ) {}

  @Get('applications')
  @ApiOperation({
    summary: 'Get applications flagged to liaison officer',
    description:
      'Retrieves applications that have been flagged to the liaison officer for review',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applications retrieved successfully',
    type: LiaisonReviewListDto,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SubmissionStatus,
    description: 'Filter by application status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  async getFlaggedApplications(
    @CurrentUser() user: JwtUserPayload,
    @Query(new ValidationPipe({ transform: true }))
    filters: LiaisonReviewFiltersDto,
  ): Promise<BaseResponseDto<LiaisonReviewListDto>> {
    const result = await this.dashboardLiaisonService.getFlaggedApplications(
      user.id,
      filters,
    );

    return {
      success: true,
      message: 'Flagged applications retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('applications/:submissionId')
  @ApiOperation({
    summary: 'Get detailed application for liaison review',
    description:
      'Retrieves detailed application data for liaison officer review',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application details retrieved successfully',
    type: ApplicationReviewDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found or not flagged to liaison officer',
  })
  @ApiParam({ name: 'submissionId', description: 'Application submission ID' })
  async getApplicationForReview(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<ApplicationReviewDto>> {
    const result = await this.dashboardLiaisonService.getApplicationForReview(
      submissionId,
      user.id,
    );

    return {
      success: true,
      message: 'Application details retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get liaison officer statistics',
    description:
      'Retrieves statistics for applications handled by the liaison officer',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: LiaisonStatsDto,
  })
  async getLiaisonStats(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<LiaisonStatsDto>> {
    const result = await this.dashboardLiaisonService.getLiaisonStats(user.id);

    return {
      success: true,
      message: 'Liaison officer statistics retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('applications/:submissionId/action')
  @ApiOperation({
    summary: 'Take action on flagged application',
    description:
      'Allows liaison officer to approve, reject, request info, or escalate applications',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action taken successfully',
    type: LiaisonActionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found or not flagged to liaison officer',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid action or missing required fields',
  })
  @ApiParam({ name: 'submissionId', description: 'Application submission ID' })
  async takeActionOnApplication(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() actionDto: LiaisonActionDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<LiaisonActionResponseDto>> {
    // Ensure the submissionId in the body matches the param
    actionDto.submissionId = submissionId;

    const result = await this.dashboardLiaisonService.takeActionOnApplication(
      actionDto,
      user.id,
    );

    return {
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('applications/status/:status')
  @ApiOperation({
    summary: 'Get applications by status',
    description:
      'Retrieves applications with specific status for liaison officer',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applications retrieved successfully',
    type: LiaisonReviewListDto,
  })
  @ApiParam({
    name: 'status',
    enum: SubmissionStatus,
    description: 'Application status to filter by',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  async getApplicationsByStatus(
    @Param('status') status: SubmissionStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<LiaisonReviewListDto>> {
    const result = await this.dashboardLiaisonService.getApplicationsByStatus(
      user.id,
      status,
      page,
      limit,
    );

    return {
      success: true,
      message: `${status} applications retrieved successfully`,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get liaison review history',
    description:
      'Retrieve applications that the liaison officer has reviewed (approved, rejected, requested info, or escalated)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liaison review history retrieved successfully',
    type: LiaisonHistoryDto,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by application status',
    example: 'UNDER_REVIEW',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: ['APPROVE', 'REJECT', 'REQUEST_INFO', 'ESCALATE'],
    description: 'Filter by action taken',
    example: 'APPROVE',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Filter from date (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'Filter to date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  async getLiaisonHistory(
    @CurrentUser() user: JwtUserPayload,
    @Query(new ValidationPipe({ transform: true }))
    query: LiaisonHistoryQueryDto,
  ): Promise<BaseResponseDto<LiaisonHistoryDto>> {
    const result = await this.dashboardLiaisonService.getLiaisonHistory(
      user.id,
      query,
    );

    return {
      success: true,
      message: 'Liaison review history retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
