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
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UploadedFiles,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { FormSubmissionsService } from './services/form-submissions.service';
import {
  CreateFormSubmissionDto,
  UpdateFormSubmissionDto,
  SubmitFormDto,
  FormSubmissionDto,
  SubmissionQueryDto,
  SaveDraftDto,
  FileUploadDto,
  AuthenticatedFormDto,
  AvailableFormsQueryDto,
  CancelSubmissionDto,
} from './dto/submission.dto';
import { ApiOkBaseResponse } from '@decorators/api-ok-base-response.decorator';
import { ApiDefaultResponse } from '@decorators/api-default-response.decorator';
import { Transform } from 'class-transformer';
import { IsOptional, IsNotEmpty, IsUUID, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Custom DTO for multipart form data
class MultipartFileUploadDto {
  @ApiProperty({
    description: 'Field ID this file belongs to (required for validation)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  fieldId: string;

  @ApiProperty({
    description: 'Submission ID (required for validation and security)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  submissionId: string;

  @ApiProperty({
    description: 'File metadata as JSON string (for single file upload)',
    example:
      '{"originalName":"passport.pdf","size":1024000,"description":"Front page of passport"}',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  metadata?: any;

  @ApiProperty({
    description:
      'Individual file metadata as JSON string (for multiple file upload)',
    example:
      '[{"originalName":"passport.pdf","description":"Front page"},{"originalName":"visa.pdf","description":"Visa page"}]',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  fileMetadata?: any;

  @ApiProperty({
    description:
      'Upload type: "single" for one file, "multiple" for multiple files',
    example: 'single',
    enum: ['single', 'multiple'],
    required: false,
  })
  @IsOptional()
  @IsIn(['single', 'multiple'])
  uploadType?: 'single' | 'multiple';

  // These fields are handled by multer, not validation
  @ApiProperty({
    description: 'Single file upload',
    type: 'string',
    format: 'binary',
    required: false,
  })
  @IsOptional()
  file?: any;

  @ApiProperty({
    description: 'Multiple files upload',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    required: false,
  })
  @IsOptional()
  files?: any;
}

@ApiTags('Form Submissions')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('submissions')
export class FormSubmissionsController {
  constructor(private readonly submissionsService: FormSubmissionsService) {}

  // User Form Access and Submission Management
  @Get('forms')
  @ApiOperation({
    summary: 'Get available forms for applicant',
    description:
      'Get list of all forms available to the authenticated applicant. Can be filtered by country.',
  })
  @ApiQuery({
    name: 'countryId',
    required: false,
    description: 'Filter by target country ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Filter by country ISO code (2-letter)',
    example: 'SA',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search forms by name or description',
    example: 'visa',
  })
  @ApiQuery({
    name: 'applicationType',
    required: false,
    description: 'Filter by application type code (e.g., TOURIST, BUSINESS)',
    example: 'TOURIST',
  })
  @ApiResponse({
    status: 200,
    description: 'Available forms retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              country: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  isoCode2: { type: 'string' },
                  flag: { type: 'string' },
                },
              },
              sections: { type: 'number' },
              estimatedTime: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getAvailableForms(
    @CurrentUser() user: JwtUserPayload,
    @Query() query: AvailableFormsQueryDto,
  ) {
    const forms = await this.submissionsService.getAvailableFormsForUser(
      user.id,
      query,
    );
    return {
      success: true,
      message: 'Available forms retrieved successfully',
      data: forms,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('forms/:formId')
  @ApiOperation({
    summary: 'Get form with progress and current responses',
    description:
      'Get complete form template with user progress and current responses',
  })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({
    status: 200,
    description: 'Form with progress retrieved successfully',
    type: AuthenticatedFormDto,
  })
  async getFormWithProgress(
    @CurrentUser() user: JwtUserPayload,
    @Param('formId', ParseUUIDPipe) formId: string,
  ) {
    const formData = await this.submissionsService.getFormForUser(
      user.id,
      formId,
    );
    return {
      success: true,
      message: 'Form retrieved successfully',
      data: formData,
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Create new form submission (draft)',
    description:
      'Create a new draft submission for a form. Travel agents can create on behalf of a client by providing optional clientId.',
  })
  @ApiOkBaseResponse({ dto: FormSubmissionDto })
  @ApiDefaultResponse({ type: FormSubmissionDto })
  async createSubmission(
    @CurrentUser() user: JwtUserPayload,
    @Body() createSubmissionDto: CreateFormSubmissionDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.createSubmission(
      user.id,
      createSubmissionDto,
    );
  }

  @Post('submit')
  @ApiOperation({
    summary: 'Submit form for review',
    description:
      'Submit a completed form for review (validates all required fields). Optionally create a biometric appointment in the same request.',
  })
  @ApiOkBaseResponse({ dto: FormSubmissionDto })
  @ApiDefaultResponse({ type: FormSubmissionDto })
  async submitForm(
    @CurrentUser() user: JwtUserPayload,
    @Body() submitDto: SubmitFormDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.submitForm(user.id, submitDto);
  }

  @Post('draft')
  @ApiOperation({
    summary: 'Save form as draft',
    description:
      'Save partial form progress as draft (auto-save functionality)',
  })
  @ApiOkBaseResponse({ dto: FormSubmissionDto })
  @ApiDefaultResponse({ type: FormSubmissionDto })
  async saveDraft(
    @CurrentUser() user: JwtUserPayload,
    @Body() draftDto: SaveDraftDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.saveDraft(user.id, draftDto);
  }

  @Get('my')
  @ApiOperation({
    summary: 'Get my form submissions',
    description: 'Get all submissions for the authenticated user',
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
  @ApiQuery({
    name: 'search',
    required: false,
    description:
      'Search term (searches reference number, form name, and description)',
    example: 'SA25000001',
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
  async getMySubmissions(
    @CurrentUser() user: JwtUserPayload,
    @Query() queryDto: SubmissionQueryDto,
  ) {
    return this.submissionsService.getUserSubmissions(user.id, queryDto);
  }

  @Get('queried')
  @ApiOperation({
    summary: 'Get my queried applications',
    description:
      'Get applications that need additional information or documents',
  })
  @ApiOkBaseResponse({ dto: FormSubmissionDto, isArray: true })
  @ApiDefaultResponse({ type: FormSubmissionDto, isArray: true })
  async getQueriedSubmissions(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<FormSubmissionDto[]> {
    return this.submissionsService.getQueriedSubmissions(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get submission by ID',
    description: 'Get a specific submission (user can only access their own)',
  })
  @ApiParam({
    name: 'id',
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: FormSubmissionDto })
  @ApiDefaultResponse({ type: FormSubmissionDto })
  async getSubmissionById(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.getSubmissionById(user.id, id);
  }

  // get submission by reference number
  @Get('reference-number/:referenceNumber')
  @ApiOperation({
    summary: 'Get submission by Reference number',
    description: 'Get a specific submission (user can only access their own)',
  })
  @ApiParam({
    name: 'referenceNumber',
    description: 'Refrence Number',
    example: 'MA00425000026',
  })
  @ApiOkBaseResponse({ dto: FormSubmissionDto })
  @ApiDefaultResponse({ type: FormSubmissionDto })
  async getSubmissionByReferenceNumber(
    @CurrentUser() user: JwtUserPayload,
    @Param('referenceNumber') referenceNumber: string,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.getSubmissionByReferenceNumber(
      user.id,
      referenceNumber,
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update submission',
    description: 'Update a draft submission (only drafts can be updated)',
  })
  @ApiParam({
    name: 'id',
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: FormSubmissionDto })
  @ApiDefaultResponse({ type: FormSubmissionDto })
  async updateSubmission(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateFormSubmissionDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.updateSubmission(user.id, id, updateDto);
  }

  @Put(':id/resubmit')
  @ApiOperation({
    summary: 'Update and resubmit queried application',
    description:
      'Update a queried application and resubmit it for review (only queried applications)',
  })
  @ApiParam({
    name: 'id',
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: FormSubmissionDto })
  @ApiDefaultResponse({ type: FormSubmissionDto })
  async updateQueriedSubmission(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateFormSubmissionDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.updateQueriedSubmission(
      user.id,
      id,
      updateDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Permanently delete submission',
    description:
      'Permanently delete a DRAFT submission and clean up all associated files and data. This action cannot be undone. Only DRAFT submissions can be permanently deleted. For submitted applications, use the cancel endpoint instead.',
  })
  @ApiParam({
    name: 'id',
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description:
      'Submission permanently deleted successfully and all associated data cleaned up',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Cannot delete non-draft submissions. Use cancel endpoint instead.',
  })
  @ApiDefaultResponse({})
  async deleteSubmission(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.submissionsService.deleteSubmission(user.id, id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel submission',
    description:
      'Cancel a submitted application (soft delete). Only SUBMITTED, UNDER_REVIEW, FLAGGED, or QUERIED applications can be cancelled.',
  })
  @ApiParam({
    name: 'id',
    description: 'Submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    description: 'Cancellation details',
    type: CancelSubmissionDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Submission cancelled successfully',
    type: FormSubmissionDto,
  })
  @ApiDefaultResponse({})
  async cancelSubmission(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: CancelSubmissionDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.cancelSubmission(user.id, id, cancelDto);
  }

  // File Upload Endpoint
  @Post('upload')
  @UseInterceptors(AnyFilesInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload files for form field',
    description:
      'Upload one or multiple files for a specific form field with comprehensive validation. ' +
      'Files are validated against field configuration (size, type, count limits). ' +
      'Individual file metadata can be provided for multiple file uploads. ' +
      'Use "file" for single file or "files" for multiple files. ' +
      'Both fieldId and submissionId are required for security and validation.',
  })
  @ApiBody({
    description: 'File upload data',
    schema: {
      type: 'object',
      properties: {
        fieldId: {
          type: 'string',
          description:
            'Field ID this file belongs to (required for validation)',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        submissionId: {
          type: 'string',
          description: 'Submission ID (required for validation and security)',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        metadata: {
          type: 'string',
          description: 'File metadata as JSON string (for single file upload)',
          example:
            '{"originalName":"passport.pdf","size":1024000,"description":"Front page of passport"}',
        },
        fileMetadata: {
          type: 'string',
          description:
            'Individual file metadata as JSON string (for multiple file upload)',
          example:
            '[{"originalName":"passport.pdf","description":"Front page"},{"originalName":"visa.pdf","description":"Visa page"}]',
        },
        uploadType: {
          type: 'string',
          enum: ['single', 'multiple'],
          description: 'Upload type (optional, auto-detected from file count)',
          example: 'single',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Single file upload (use this OR files, not both)',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple files upload (use this OR file, not both)',
        },
      },
      required: ['fieldId', 'submissionId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          oneOf: [
            {
              type: 'object',
              properties: {
                fileUrl: { type: 'string' },
                fileName: { type: 'string' },
                fileSize: { type: 'number' },
                mimeType: { type: 'string' },
                fieldId: { type: 'string' },
                submissionUpdated: { type: 'boolean' },
              },
            },
            {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      fileUrl: { type: 'string' },
                      fileName: { type: 'string' },
                      fileSize: { type: 'number' },
                      mimeType: { type: 'string' },
                      metadata: { type: 'object' },
                    },
                  },
                },
                fieldId: { type: 'string' },
                totalFiles: { type: 'number' },
                totalSize: { type: 'number' },
                submissionUpdated: { type: 'boolean' },
                validationSummary: {
                  type: 'object',
                  properties: {
                    totalFiles: { type: 'number' },
                    validFiles: { type: 'number' },
                    invalidFiles: { type: 'number' },
                    errors: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          fileName: { type: 'string' },
                          error: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        timestamp: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'File validation failed (size, type, field configuration, or multiple files not allowed)',
  })
  @ApiResponse({
    status: 404,
    description: 'Form field not found',
  })
  @ApiDefaultResponse({})
  async uploadFiles(
    @CurrentUser() user: JwtUserPayload,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB per file
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
    @Body() multipartDto: MultipartFileUploadDto,
  ) {
    // Convert multipart DTO to regular DTO
    const uploadDto: FileUploadDto = {
      fieldId: multipartDto.fieldId,
      submissionId: multipartDto.submissionId,
      metadata: multipartDto.metadata,
      fileMetadata: multipartDto.fileMetadata,
      uploadType: multipartDto.uploadType,
    };
    // Determine if this is single or multiple file upload
    if (files.length === 1) {
      const result = await this.submissionsService.uploadSingleFile(
        user.id,
        files[0],
        uploadDto,
      );
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } else {
      const result = await this.submissionsService.uploadMultipleFiles(
        user.id,
        files,
        uploadDto,
      );
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
