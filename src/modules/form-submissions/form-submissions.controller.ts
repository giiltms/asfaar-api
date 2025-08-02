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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
} from './dto/submission.dto';
import { ApiOkBaseResponse } from '@decorators/api-ok-base-response.decorator';
import { ApiDefaultResponse } from '@decorators/api-default-response.decorator';

@ApiTags('Form Submissions')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('submissions')
export class FormSubmissionsController {
  constructor(private readonly submissionsService: FormSubmissionsService) {}

  // User Submission Management
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
    return this.submissionsService.createSubmission(req.user.id, createSubmissionDto);
  }

  @Post('submit')
  @ApiOperation({
    summary: 'Submit form for review',
    description: 'Submit a completed form for review (validates all required fields)',
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
    description: 'Save partial form progress as draft (auto-save functionality)',
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
  @ApiQuery({ name: 'formId', required: false, description: 'Filter by form ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
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

  // File Upload Endpoints
  @Post('upload/single')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload single file for form field',
    description: 'Upload a single file for a specific form field',
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            fileUrl: { type: 'string' },
            fileName: { type: 'string' },
            fileSize: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiDefaultResponse({})
  async uploadSingleFile(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: FileUploadDto,
  ) {
    // TODO: Implement file upload logic with storage service
    return {
      fileUrl: `https://storage.example.com/uploads/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size,
    };
  }

  @Post('upload/multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload multiple files for form field',
    description: 'Upload multiple files for a specific form field',
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
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
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiDefaultResponse({})
  async uploadMultipleFiles(
    @Request() req: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDto: FileUploadDto,
  ) {
    // TODO: Implement file upload logic with storage service
    return {
      files: files.map(file => ({
        fileUrl: `https://storage.example.com/uploads/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
      })),
    };
  }
} 