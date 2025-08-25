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
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
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
  ApiHeader,
} from '@nestjs/swagger';
import {
  FileInterceptor,
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
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

// Custom pipe to parse JSON fields from multipart form data
class ParseMultipartJsonPipe {
  transform(value: any) {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
}

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
    example: '{"originalName":"passport.pdf","size":1024000,"description":"Front page of passport"}',
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
    description: 'Individual file metadata as JSON string (for multiple file upload)',
    example: '[{"originalName":"passport.pdf","description":"Front page"},{"originalName":"visa.pdf","description":"Visa page"}]',
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
    description: 'Upload type: "single" for one file, "multiple" for multiple files',
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
    @Request() req: any,
    @Query() query: AvailableFormsQueryDto,
  ) {
    const forms = await this.submissionsService.getAvailableFormsForUser(
      req.user.id,
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
    @Request() req: any,
    @Param('formId', ParseUUIDPipe) formId: string,
  ) {
    const formData = await this.submissionsService.getFormForUser(
      req.user.id,
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
    description: 'Create a new draft submission for a form',
  })
  @ApiOkBaseResponse({ dto: FormSubmissionDto })
  @ApiDefaultResponse({ type: FormSubmissionDto })
  async createSubmission(
    @Request() req: any,
    @Body() createSubmissionDto: CreateFormSubmissionDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.createSubmission(
      req.user.id,
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
    @Request() req: any,
    @Body() submitDto: SubmitFormDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.submitForm(req.user.id, submitDto);
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
    @Request() req: any,
    @Body() draftDto: SaveDraftDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.saveDraft(req.user.id, draftDto);
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
    @Request() req: any,
    @Query() queryDto: SubmissionQueryDto,
  ) {
    return this.submissionsService.getUserSubmissions(req.user.id, queryDto);
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
    @Request() req: any,
  ): Promise<FormSubmissionDto[]> {
    return this.submissionsService.getQueriedSubmissions(req.user.id);
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
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.getSubmissionById(req.user.id, id);
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
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateFormSubmissionDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.updateSubmission(req.user.id, id, updateDto);
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
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateFormSubmissionDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.updateQueriedSubmission(
      req.user.id,
      id,
      updateDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete submission',
    description: 'Delete a draft submission (only drafts can be deleted)',
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
  async deleteSubmission(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.submissionsService.deleteSubmission(req.user.id, id);
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
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: CancelSubmissionDto,
  ): Promise<FormSubmissionDto> {
    return this.submissionsService.cancelSubmission(req.user.id, id, cancelDto);
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
          example: '{"originalName":"passport.pdf","size":1024000,"description":"Front page of passport"}',
        },
        fileMetadata: {
          type: 'string',
          description: 'Individual file metadata as JSON string (for multiple file upload)',
          example: '[{"originalName":"passport.pdf","description":"Front page"},{"originalName":"visa.pdf","description":"Visa page"}]',
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
    @Request() req: any,
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
        req.user.id,
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
        req.user.id,
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
