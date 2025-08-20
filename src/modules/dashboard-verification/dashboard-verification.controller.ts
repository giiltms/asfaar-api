import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
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
import { DashboardVerificationService } from './dashboard-verification.service';
import {
  ApplicationReviewDto,
  VerificationReviewDto,
  VerificationReviewListDto,
  VerificationStatsDto,
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
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('status') status?: string,
  ): Promise<BaseResponseDto<VerificationReviewListDto>> {
    const result = await this.dashboardVerificationService.getApplicationsForReview(
      page,
      limit,
      status,
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
    const result = await this.dashboardVerificationService.getApplicationForReview(
      submissionId,
    );

    return {
      success: true,
      message: 'Application details retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('applications/:submissionId/review')
  @ApiOperation({
    summary: 'Review and update application verification status',
    description:
      'Review application and update verification status (VERIFIED, REJECTED, NEEDS_RETAKES)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application reviewed successfully',
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
  async reviewApplication(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() reviewDto: VerificationReviewDto,
    @Request() req: any,
  ): Promise<BaseResponseDto<{ success: boolean; message: string }>> {
    // Ensure the submissionId in the body matches the param
    reviewDto.submissionId = submissionId;

    const result = await this.dashboardVerificationService.reviewApplication(
      reviewDto,
      req.user.id,
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
    const result = await this.dashboardVerificationService.getVerificationStats();

    return {
      success: true,
      message: 'Verification statistics retrieved successfully',
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
