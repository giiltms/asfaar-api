import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsUUID,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';
import { SubmissionStatus } from '@prisma/client';

// Field Response DTOs
export class CreateFieldResponseDto {
  @ApiProperty({
    description: 'Field ID from the form template',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  fieldId: string;

  @ApiProperty({
    description: 'Field name for reference',
    example: 'first_name',
  })
  @IsString()
  @IsNotEmpty()
  fieldName: string;

  @ApiPropertyOptional({
    description: 'Field response value (can be string, number, boolean, array)',
    example: 'John Doe',
  })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({
    description: 'File upload URLs for file fields',
    type: [String],
    example: ['https://storage.example.com/uploads/file1.pdf'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileUrls?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata for the response',
    example: { capturedAt: '2024-01-15T10:30:00Z', ipAddress: '192.168.1.1' },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateFieldResponseDto extends PartialType(CreateFieldResponseDto) {}

export class FieldResponseDto {
  @ApiProperty({ description: 'Response ID' })
  id: string;

  @ApiProperty({ description: 'Field ID' })
  fieldId: string;

  @ApiProperty({ description: 'Field name' })
  fieldName: string;

  @ApiProperty({ description: 'Response value', required: false })
  value?: any;

  @ApiProperty({ description: 'File URLs', type: [String] })
  fileUrls: string[];

  @ApiProperty({ description: 'Response metadata', required: false })
  metadata?: any;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;
}

// Form Submission DTOs
export class CreateFormSubmissionDto {
  @ApiProperty({
    description: 'Form ID to submit',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  formId: string;

  @ApiPropertyOptional({
    description: 'Field responses',
    type: [CreateFieldResponseDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFieldResponseDto)
  responses?: CreateFieldResponseDto[];

  @ApiPropertyOptional({
    description: 'Submission status',
    enum: SubmissionStatus,
    example: SubmissionStatus.DRAFT,
    default: SubmissionStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus = SubmissionStatus.DRAFT;

  @ApiPropertyOptional({
    description: 'Additional submission metadata',
    example: {
      userAgent: 'Mozilla/5.0...',
      sessionId: 'sess_123',
      submitLocation: { lat: 6.5244, lng: 3.3792 }
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateFormSubmissionDto extends PartialType(CreateFormSubmissionDto) {}

export class SubmitFormDto {
  @ApiProperty({
    description: 'Form ID to submit',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  formId: string;

  @ApiProperty({
    description: 'Field responses',
    type: [CreateFieldResponseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFieldResponseDto)
  responses: CreateFieldResponseDto[];

  @ApiPropertyOptional({
    description: 'Additional submission metadata',
    example: {
      submitLocation: { lat: 6.5244, lng: 3.3792 },
      deviceInfo: 'iPhone 13 Pro'
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class FormSubmissionDto {
  @ApiProperty({ description: 'Submission ID' })
  id: string;

  @ApiProperty({ description: 'Form ID' })
  formId: string;

  @ApiProperty({ description: 'User ID who submitted' })
  userId: string;

  @ApiProperty({ description: 'Submission status', enum: SubmissionStatus })
  status: SubmissionStatus;

  @ApiProperty({ description: 'Field responses', type: [FieldResponseDto] })
  responses: FieldResponseDto[];

  @ApiProperty({ description: 'Submission metadata', required: false })
  metadata?: any;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Submitted timestamp', required: false })
  submittedAt?: Date;

  @ApiProperty({ description: 'Reviewed timestamp', required: false })
  reviewedAt?: Date;

  @ApiProperty({ description: 'Reviewer ID', required: false })
  reviewedBy?: string;

  @ApiProperty({ description: 'Review notes', required: false })
  reviewNotes?: string;

  // Include form details for convenience
  @ApiPropertyOptional({ description: 'Form details', required: false })
  form?: {
    id: string;
    name: string;
    description?: string;
  };

  // Include user details for admin views
  @ApiPropertyOptional({ description: 'Submitter details', required: false })
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

// Public Form DTOs (for unauthenticated access)
export class PublicFormDto {
  @ApiProperty({ description: 'Form ID' })
  id: string;

  @ApiProperty({ description: 'Form name' })
  name: string;

  @ApiProperty({ description: 'Form description', required: false })
  description?: string;

  @ApiProperty({ description: 'Form sections with fields' })
  sections: Array<{
    id: string;
    title: string;
    description?: string;
    order: number;
    groups: Array<{
      id: string;
      title?: string;
      description?: string;
      order: number;
      repeatable: boolean;
      fields: Array<{
        id: string;
        label: string;
        name: string;
        type: string;
        required: boolean;
        placeholder?: string;
        defaultValue?: string;
        validation?: any;
        config?: any;
        visibilityCondition?: any;
        calculation?: any;
        order: number;
        options: Array<{
          id: string;
          label: string;
          value: string;
          order: number;
        }>;
      }>;
    }>;
  }>;
}

// Submission Management DTOs
export class SubmissionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  formId?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: SubmissionStatus,
    example: SubmissionStatus.SUBMITTED,
  })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @ApiPropertyOptional({
    description: 'Search term (searches in form name and user details)',
    example: 'visa application',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by submission date from',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by submission date to',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
    enum: ['createdAt', 'submittedAt', 'status', 'formName', 'userName'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class ReviewSubmissionDto {
  @ApiProperty({
    description: 'Review status',
    enum: ['APPROVED', 'REJECTED'], // Use string values instead of enum references
    example: 'APPROVED',
  })
  @IsEnum(['APPROVED', 'REJECTED']) // Use string array instead of enum references
  status: 'APPROVED' | 'REJECTED'; // Use string literal types instead of enum

  @ApiPropertyOptional({
    description: 'Review notes',
    example: 'All documents are valid and complete.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

// File Upload DTOs
export class FileUploadDto {
  @ApiProperty({
    description: 'Field ID this file belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  fieldId: string;

  @ApiProperty({
    description: 'Submission ID (if editing existing submission)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

  @ApiProperty({
    description: 'File metadata',
    example: { originalName: 'passport.pdf', size: 1024000 },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

// Draft Management DTOs
export class SaveDraftDto {
  @ApiProperty({
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  formId: string;

  @ApiProperty({
    description: 'Field responses (partial)',
    type: [CreateFieldResponseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFieldResponseDto)
  responses: CreateFieldResponseDto[];

  @ApiPropertyOptional({
    description: 'Auto-save metadata',
    example: { lastSaved: '2024-01-15T10:30:00Z', progress: 60 },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

// Analytics DTOs
export class SubmissionAnalyticsDto {
  @ApiProperty({ description: 'Total submissions' })
  total: number;

  @ApiProperty({ description: 'Submissions by status' })
  byStatus: {
    draft: number;
    submitted: number;
    reviewed: number;
    approved: number;
    rejected: number;
  };

  @ApiProperty({ description: 'Submissions by form' })
  byForm: Array<{
    formId: string;
    formName: string;
    count: number;
  }>;

  @ApiProperty({ description: 'Recent submissions' })
  recent: Array<{
    date: string;
    count: number;
  }>;

  @ApiProperty({ description: 'Completion rate (submitted/total)' })
  completionRate: number;

  @ApiProperty({ description: 'Average completion time in minutes' })
  avgCompletionTime?: number;
} 