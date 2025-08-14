import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
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
  Length,
  MaxLength,
} from 'class-validator';
import { SubmissionStatus, FieldType } from '@prisma/client';

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

export class UpdateFieldResponseDto extends PartialType(
  CreateFieldResponseDto,
) {}

// Progress tracking DTOs
export class SectionProgressDto {
  @ApiProperty({ description: 'Section ID' })
  sectionId: string;

  @ApiProperty({ description: 'Section title' })
  sectionTitle: string;

  @ApiProperty({ description: 'Section order' })
  sectionOrder: number;

  @ApiProperty({ description: 'Total fields in section' })
  totalFields: number;

  @ApiProperty({ description: 'Required fields in section' })
  requiredFields: number;

  @ApiProperty({ description: 'Completed fields in section' })
  completedFields: number;

  @ApiProperty({ description: 'Completed required fields in section' })
  completedRequiredFields: number;

  @ApiProperty({ description: 'Whether section is considered complete' })
  isComplete: boolean;

  @ApiProperty({ description: 'Section completion percentage (0-100)' })
  completionPercentage: number;

  @ApiProperty({ description: 'Missing required field names', type: [String] })
  missingRequiredFields: string[];
}

export class FormProgressDto {
  @ApiProperty({ description: 'Form ID' })
  formId: string;

  @ApiProperty({ description: 'Form name' })
  formName: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Current submission ID (if exists)' })
  submissionId?: string;

  @ApiProperty({ description: 'Current submission status' })
  submissionStatus?: SubmissionStatus;

  @ApiProperty({ description: 'Total sections in form' })
  totalSections: number;

  @ApiProperty({ description: 'Completed sections' })
  completedSections: number;

  @ApiProperty({ description: 'Overall progress percentage (0-100)' })
  overallProgress: number;

  @ApiProperty({ description: 'Total fields in entire form' })
  totalFields: number;

  @ApiProperty({ description: 'Total required fields in entire form' })
  totalRequiredFields: number;

  @ApiProperty({ description: 'Completed fields in entire form' })
  completedFields: number;

  @ApiProperty({ description: 'Completed required fields in entire form' })
  completedRequiredFields: number;

  @ApiProperty({ description: 'Whether form is ready for submission' })
  canSubmit: boolean;

  @ApiProperty({
    description: 'Missing required fields across entire form',
    type: [String],
  })
  missingRequiredFields: string[];

  @ApiProperty({
    description: 'Section-by-section progress',
    type: [SectionProgressDto],
  })
  sections: SectionProgressDto[];

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated?: Date;

  @ApiProperty({
    description: 'Estimated completion time in minutes (optional)',
  })
  estimatedCompletionTime?: number;
}

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
      submitLocation: { lat: 6.5244, lng: 3.3792 },
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateFormSubmissionDto extends PartialType(
  CreateFormSubmissionDto,
) {}

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
      deviceInfo: 'iPhone 13 Pro',
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

  @ApiPropertyOptional({
    description: 'Reference Number',
    example: 'SA25000001',
  })
  referenceNumber?: string;

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

// Public Form DTOs (DEPRECATED - No longer used)
// Left for backward compatibility, but public form access is no longer supported
export class PublicFormDto {
  @ApiProperty({ description: 'Form ID' })
  id: string;

  @ApiProperty({ description: 'Form name' })
  name: string;

  @ApiPropertyOptional({ description: 'Form description' })
  description?: string;

  @ApiProperty({ description: 'Form sections with fields' })
  sections: {
    id: string;
    title: string;
    description?: string;
    order: number;
    groups: {
      id: string;
      title: string;
      description?: string;
      order: number;
      fields: {
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
        metadata?: any;
        order: number;
        options: {
          id: string;
          label: string;
          value: string;
          order: number;
        }[];
      }[];
    }[];
  }[];

  @ApiPropertyOptional({
    description: 'Form progress (only included for authenticated users)',
    type: SectionProgressDto,
  })
  progress?: {
    formId: string;
    formName: string;
    userId?: string;
    submissionId?: string;
    submissionStatus?: SubmissionStatus;
    totalSections: number;
    completedSections: number;
    overallProgress: number;
    totalFields: number;
    totalRequiredFields: number;
    completedFields: number;
    completedRequiredFields: number;
    canSubmit: boolean;
    missingRequiredFields: string[];
    sections: SectionProgressDto[];
    lastUpdated?: Date;
    estimatedCompletionTime?: number;
  };

  @ApiPropertyOptional({
    description:
      'Current user responses (only included for authenticated users)',
  })
  currentResponses?: {
    fieldId: string;
    fieldName: string;
    value: any;
    fileUrls?: string[];
  }[];
}

// New DTO for authenticated form access
export class AuthenticatedFormDto {
  @ApiProperty({ description: 'Form details' })
  form: {
    id: string;
    name: string;
    description?: string;
    sections: any[];
    country?: {
      id: string;
      name: string;
      isoCode2: string;
      isoCode3: string;
      currency: string;
      flag: string;
    };
  };

  @ApiProperty({
    description: 'User progress on this form',
    type: FormProgressDto,
  })
  progress: FormProgressDto;

  @ApiProperty({ description: 'Current user responses', type: 'array' })
  currentResponses: {
    fieldId: string;
    fieldName: string;
    value: any;
    fileUrls?: string[];
    metadata?: any;
  }[];

  @ApiPropertyOptional({ description: 'Current submission details' })
  submission?: {
    id: string;
    status: SubmissionStatus;
    submittedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  };
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

// Available Forms Query DTO
export class AvailableFormsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by target country ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  countryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by country ISO code (2-letter)',
    example: 'SA',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Transform(({ value }) => value?.toUpperCase())
  country?: string;

  @ApiPropertyOptional({
    description: 'Search forms by name or description',
    example: 'visa',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Include inactive forms (admin only)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeInactive?: boolean = false;
}
