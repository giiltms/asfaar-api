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
import { DashboardEmbassyService } from './dashboard-embassy.service';
import {
  ApplicationReviewDto,
  EmbassyReviewListDto,
  EmbassyStatsDto,
  EmbassyActionDto,
  EmbassyReviewFiltersDto,
  EmbassyActionResponseDto,
  EmbassyHistoryDto,
  EmbassyHistoryQueryDto,
} from './dto/embassy-review.dto';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { SubmissionStatus } from '@prisma/client';

@ApiTags('Embassy Officer Dashboard')
@Controller('dashboard/embassy')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class DashboardEmbassyController {
  constructor(
    private readonly dashboardEmbassyService: DashboardEmbassyService,
  ) {}

  @Get('applications')
  @ApiOperation({
    summary: 'Get applications for embassy officer country',
    description:
      "Retrieves applications for the embassy officer's assigned country",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applications retrieved successfully',
    type: EmbassyReviewListDto,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SubmissionStatus,
    description: 'Filter by application status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    description: 'Filter by priority level',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by reference number, applicant name, applicant email, or country',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Filter by submission date from (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Filter by submission date to (YYYY-MM-DD)',
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
  async getApplicationsForCountry(
    @CurrentUser() user: JwtUserPayload,
    @Query(new ValidationPipe({ transform: true }))
    filters: EmbassyReviewFiltersDto,
  ): Promise<BaseResponseDto<EmbassyReviewListDto>> {
    const result = await this.dashboardEmbassyService.getApplicationsForCountry(
      user.id,
      filters,
    );

    return {
      success: true,
      message: 'Applications retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('applications/:submissionId')
  @ApiOperation({
    summary: 'Get detailed application for embassy review',
    description:
      'Retrieves detailed application data for embassy officer review',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application details retrieved successfully',
    type: ApplicationReviewDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found or not for embassy officer country',
  })
  @ApiParam({ name: 'submissionId', description: 'Application submission ID' })
  async getApplicationForReview(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<ApplicationReviewDto>> {
    const result = await this.dashboardEmbassyService.getApplicationForReview(
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
    summary: 'Get embassy officer statistics',
    description:
      'Retrieves statistics for applications handled by the embassy officer for their country',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: EmbassyStatsDto,
  })
  async getEmbassyStats(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<EmbassyStatsDto>> {
    const result = await this.dashboardEmbassyService.getEmbassyStats(user.id);

    return {
      success: true,
      message: 'Embassy officer statistics retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('applications/:submissionId/action')
  @ApiOperation({
    summary: 'Take final action on application',
    description:
      'Allows embassy officer to make final decisions: approve, reject, request info, or suspend applications',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Action taken successfully',
    type: EmbassyActionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found or not for embassy officer country',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid action or missing required fields',
  })
  @ApiParam({ name: 'submissionId', description: 'Application submission ID' })
  async takeFinalActionOnApplication(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() actionDto: EmbassyActionDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<EmbassyActionResponseDto>> {
    // Ensure the submissionId in the body matches the param
    actionDto.submissionId = submissionId;

    const result =
      await this.dashboardEmbassyService.takeFinalActionOnApplication(
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
      'Retrieves applications with specific status for embassy officer country',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applications retrieved successfully',
    type: EmbassyReviewListDto,
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
  ): Promise<BaseResponseDto<EmbassyReviewListDto>> {
    const result = await this.dashboardEmbassyService.getApplicationsByStatus(
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
    summary: 'Get embassy review history',
    description:
      'Retrieve applications that the embassy officer has reviewed (approved, rejected, or requested info)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Embassy review history retrieved successfully',
    type: EmbassyHistoryDto,
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
    example: 'APPROVED',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: ['APPROVE', 'REJECT', 'REQUEST_INFO'],
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
  async getEmbassyHistory(
    @CurrentUser() user: JwtUserPayload,
    @Query(new ValidationPipe({ transform: true }))
    query: EmbassyHistoryQueryDto,
  ): Promise<BaseResponseDto<EmbassyHistoryDto>> {
    const result = await this.dashboardEmbassyService.getEmbassyHistory(
      user.id,
      query,
    );

    return {
      success: true,
      message: 'Embassy review history retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
