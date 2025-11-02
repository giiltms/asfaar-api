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
import { DashboardVerificationService } from './dashboard-verification.service';
import {
  ApplicationReviewDto,
  FlagApplicationDto,
  QueryApplicationDto,
  ProcessApplicationDto,
  VerificationReviewListDto,
  VerificationStatsDto,
  VerificationReviewQueryDto,
  VerificationHistoryDto,
  VerificationHistoryQueryDto,
} from './dto/verification-review.dto';
import { BaseResponseDto } from '@common/dtos/base-response.dto';

@ApiTags('Verification Officer Dashboard')
@Controller('dashboard/verification')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class DashboardVerificationController {
  constructor(
    private readonly dashboardVerificationService: DashboardVerificationService,
  ) {}

  @Get('applications')
  @ApiOperation({
    summary: 'Get applications with biometric data for review',
    description:
      'Retrieve applications that have completed biometric capture for verification officer review',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applications retrieved successfully',
    type: VerificationReviewListDto,
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
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by status',
  })
  async getApplicationsForReview(
    @Query(new ValidationPipe({ transform: true }))
    query: VerificationReviewQueryDto,
  ): Promise<BaseResponseDto<VerificationReviewListDto>> {
    const result =
      await this.dashboardVerificationService.getApplicationsForReview(
        query.page,
        query.limit,
        query.status,
      );

    return {
      success: true,
      message: 'Applications for review retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('applications/:submissionId')
  @ApiOperation({
    summary: 'Get detailed application for review',
    description:
      'Retrieve detailed application information including applicant details, biometric data, and photos',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application details retrieved successfully',
    type: ApplicationReviewDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiParam({ name: 'submissionId', description: 'Application submission ID' })
  async getApplicationForReview(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ): Promise<BaseResponseDto<ApplicationReviewDto>> {
    const result =
      await this.dashboardVerificationService.getApplicationForReview(
        submissionId,
      );

    return {
      success: true,
      message: 'Application details retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('applications/:submissionId/flag')
  @ApiOperation({
    summary: 'Flag application and send to other departments',
    description:
      'Flag an application for review by other departments with enhanced details including flag type, priority level, and detailed reason',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application flagged successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiParam({ name: 'submissionId', description: 'Application submission ID' })
  async flagApplication(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() flagDto: FlagApplicationDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<{ success: boolean; message: string }>> {
    // Ensure the submissionId in the body matches the param
    flagDto.submissionId = submissionId;

    const result = await this.dashboardVerificationService.flagApplication(
      flagDto,
      user.id,
    );

    return {
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('applications/:submissionId/query')
  @ApiOperation({
    summary: 'Query application and request more information',
    description:
      'Send query to applicant requesting additional documents or information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application queried successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiParam({ name: 'submissionId', description: 'Application submission ID' })
  async queryApplication(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() queryDto: QueryApplicationDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<{ success: boolean; message: string }>> {
    // Ensure the submissionId in the body matches the param
    queryDto.submissionId = submissionId;

    const result = await this.dashboardVerificationService.queryApplication(
      queryDto,
      user.id,
    );

    return {
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('applications/:submissionId/process')
  @ApiOperation({
    summary: 'Send application to embassy for processing',
    description: 'Approve application and send to embassy for final processing',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application sent for processing successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Application not found',
  })
  @ApiParam({ name: 'submissionId', description: 'Application submission ID' })
  async processApplication(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() processDto: ProcessApplicationDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<{ success: boolean; message: string }>> {
    // Ensure the submissionId in the body matches the param
    processDto.submissionId = submissionId;

    const result = await this.dashboardVerificationService.processApplication(
      processDto,
      user.id,
    );

    return {
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get verification statistics',
    description: 'Retrieve verification officer dashboard statistics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    type: VerificationStatsDto,
  })
  async getVerificationStats(): Promise<BaseResponseDto<VerificationStatsDto>> {
    const result =
      await this.dashboardVerificationService.getVerificationStats();

    return {
      success: true,
      message: 'Verification statistics retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get verification history',
    description:
      'Retrieve applications that the verification officer has attended to (flagged, queried, or processed)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Verification history retrieved successfully',
    type: VerificationHistoryDto,
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
    example: 'PROCESSING',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: ['FLAGGED', 'QUERIED', 'PROCESSING'],
    description: 'Filter by action taken',
    example: 'FLAGGED',
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
  async getVerificationHistory(
    @CurrentUser() user: JwtUserPayload,
    @Query(new ValidationPipe({ transform: true }))
    query: VerificationHistoryQueryDto,
  ): Promise<BaseResponseDto<VerificationHistoryDto>> {
    const result =
      await this.dashboardVerificationService.getVerificationHistory(
        user.id,
        query,
      );

    return {
      success: true,
      message: 'Verification history retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('test')
  @ApiOperation({
    summary: 'Test verification officer dashboard endpoints',
    description: 'Test endpoint to verify the dashboard is working',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard is working',
  })
  async testDashboard(): Promise<BaseResponseDto<{ message: string }>> {
    return {
      success: true,
      message: 'Verification Officer Dashboard is working',
      data: { message: 'Dashboard endpoints are accessible' },
      timestamp: new Date().toISOString(),
    };
  }
}
