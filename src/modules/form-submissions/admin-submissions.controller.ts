import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { FormSubmissionsService } from './services/form-submissions.service';
import {
  FormSubmissionDto,
  SubmissionQueryDto,
  ReviewSubmissionDto,
  SubmissionAnalyticsDto,
} from './dto/submission.dto';
import { ApiOkBaseResponse } from '@decorators/api-ok-base-response.decorator';
import { ApiDefaultResponse } from '@decorators/api-default-response.decorator';

@ApiTags('Admin - Form Submissions')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('admin/submissions')
export class AdminSubmissionsController {
  constructor(private readonly submissionsService: FormSubmissionsService) {}

  @Get()
  // TODO: Add proper role-based authorization
  @ApiOperation({
    summary: 'Get all form submissions',
    description:
      'Get all form submissions with advanced filtering (admin only)',
  })
  @ApiQuery({
    name: 'formId',
    required: false,
    description: 'Filter by form ID',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description:
      'Search term (searches reference number, form name, description, and user details)',
    example: 'SA25000001',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    description: 'Filter from date',
  })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'All submissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            submissions: {
              type: 'array',
              items: { $ref: '#/components/schemas/FormSubmissionDto' },
            },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiDefaultResponse({})
  async getAllSubmissions(@Query() queryDto: SubmissionQueryDto) {
    return this.submissionsService.getAllSubmissions(queryDto);
  }

  @Get('analytics')
  // TODO: Add proper role-based authorization
  @ApiOperation({
    summary: 'Get submission analytics',
    description:
      'Get comprehensive analytics and statistics for form submissions',
  })
  @ApiOkBaseResponse({ dto: SubmissionAnalyticsDto })
  @ApiDefaultResponse({ type: SubmissionAnalyticsDto })
  async getSubmissionAnalytics(): Promise<SubmissionAnalyticsDto> {
    return this.submissionsService.getSubmissionAnalytics();
  }

  @Get(':id')
  // TODO: Add proper role-based authorization
  @ApiOperation({
    summary: 'Get submission by ID (admin)',
    description: 'Get any submission by ID with full details (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: FormSubmissionDto })
  @ApiDefaultResponse({ type: FormSubmissionDto })
  async getSubmissionById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FormSubmissionDto> {
    // Note: Admin can view any submission, so we use a special method or modify the service
    // For now, we'll use the user method but this should be enhanced
    const submission = await this.submissionsService.getSubmissionById(
      'admin',
      id,
    );
    return submission;
  }

  @Put(':id/review')
  // TODO: Add proper role-based authorization
  @ApiOperation({
    summary: 'Review submission',
    description: 'Approve or reject a submitted form',
  })
  @ApiParam({
    name: 'id',
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: FormSubmissionDto })
  @ApiDefaultResponse({ type: FormSubmissionDto })
  async reviewSubmission(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reviewDto: ReviewSubmissionDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.reviewSubmission(req.user.id, id, reviewDto);
  }

  @Delete(':id')
  // TODO: Add proper role-based authorization
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete submission (admin)',
    description: 'Delete any submission (admin only - use with caution)',
  })
  @ApiParam({
    name: 'id',
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Submission deleted successfully',
  })
  @ApiDefaultResponse({})
  async deleteSubmissionAdmin(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    // This should be a special admin delete method
    // For now, we'll implement it as a direct deletion
    await this.submissionsService.deleteSubmission('admin', id);
  }

  @Post(':id/restore')
  // TODO: Add proper role-based authorization
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restore cancelled submission (admin)',
    description:
      'Restore a cancelled submission back to its previous status (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Submission restored successfully',
    type: FormSubmissionDto,
  })
  @ApiDefaultResponse({})
  async restoreSubmission(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.restoreSubmission(id);
  }

  @Get('user/:userId')
  // TODO: Add proper role-based authorization
  @ApiOperation({
    summary: 'Get submissions for specific user',
    description: 'Get all submissions for a specific user (admin only)',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'formId',
    required: false,
    description: 'Filter by form ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'User submissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            submissions: {
              type: 'array',
              items: { $ref: '#/components/schemas/FormSubmissionDto' },
            },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiDefaultResponse({})
  async getUserSubmissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() queryDto: SubmissionQueryDto,
  ) {
    return this.submissionsService.getUserSubmissions(userId, queryDto);
  }

  @Get('form/:formId/stats')
  // TODO: Add proper role-based authorization
  @ApiOperation({
    summary: 'Get form submission statistics',
    description: 'Get detailed statistics for a specific form',
  })
  @ApiParam({
    name: 'formId',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Form statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            formId: { type: 'string' },
            formName: { type: 'string' },
            totalSubmissions: { type: 'number' },
            byStatus: {
              type: 'object',
              properties: {
                draft: { type: 'number' },
                submitted: { type: 'number' },
                reviewed: { type: 'number' },
                approved: { type: 'number' },
                rejected: { type: 'number' },
              },
            },
            avgCompletionTime: { type: 'number' },
            completionRate: { type: 'number' },
            abandonmentRate: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiDefaultResponse({})
  async getFormStats(@Param('formId', ParseUUIDPipe) formId: string) {
    const queryDto: SubmissionQueryDto = { formId, page: 1, limit: 1000 };
    const result = await this.submissionsService.getAllSubmissions(queryDto);

    const submissions = result.submissions;
    const statusCounts = {
      draft: 0,
      submitted: 0,
      reviewed: 0,
      approved: 0,
      rejected: 0,
    };

    submissions.forEach((submission) => {
      statusCounts[
        submission.status.toLowerCase() as keyof typeof statusCounts
      ]++;
    });

    const completedSubmissions = submissions.filter((s) => s.submittedAt);
    const avgCompletionTime =
      completedSubmissions.length > 0
        ? completedSubmissions.reduce((acc, submission) => {
          if (submission.submittedAt && submission.createdAt) {
            const timeDiff =
              new Date(submission.submittedAt).getTime() -
              new Date(submission.createdAt).getTime();
            return acc + timeDiff / 1000 / 60; // Convert to minutes
          }
          return acc;
        }, 0) / completedSubmissions.length
        : 0;

    const completionRate =
      submissions.length > 0
        ? (statusCounts.submitted / submissions.length) * 100
        : 0;

    const abandonmentRate =
      submissions.length > 0
        ? (statusCounts.draft / submissions.length) * 100
        : 0;

    // Get form details
    const form = await this.submissionsService.getFormBasicDetails(formId);

    return {
      formId,
      formName: form.name,
      totalSubmissions: submissions.length,
      byStatus: statusCounts,
      avgCompletionTime: Math.round(avgCompletionTime),
      completionRate: Math.round(completionRate * 100) / 100,
      abandonmentRate: Math.round(abandonmentRate * 100) / 100,
    };
  }

  @Put(':id/status')
  // TODO: Add proper role-based authorization
  @ApiOperation({
    summary: 'Update submission status',
    description: 'Manually update submission status (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Submission status updated successfully',
  })
  @ApiDefaultResponse({})
  async updateSubmissionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    // This would need to be implemented in the service
    // For now, we'll use the review endpoint
    const reviewDto: ReviewSubmissionDto = {
      status: body.status as any,
      reviewNotes: body.notes,
    };

    return this.submissionsService.reviewSubmission('admin', id, reviewDto);
  }
}
