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
  IsIn,
} from 'class-validator';
import { SubmissionStatus, FieldType, AppointmentClass } from '@prisma/client';

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

  @ApiPropertyOptional({
    description:
      'Instance index for repeatable groups (0-based, local to a submission). Defaults to 0 for non-repeatable fields.',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  instanceIndex?: number;
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

// Biometric Appointment DTO for form submission integration
export class BiometricAppointmentDto {
  @ApiProperty({
    description: 'Biometric center ID where appointment will take place',
    example: 'uuid-string',
  })
  @IsNotEmpty()
  @IsUUID()
  centerId: string;

  @ApiPropertyOptional({
    description: 'Appointment class/tier',
    example: 'REGULAR',
    enum: AppointmentClass,
    default: AppointmentClass.REGULAR,
  })
  @IsOptional()
  @IsEnum(AppointmentClass)
  appointmentClass?: AppointmentClass;

  @ApiProperty({
    description: 'Preferred appointment date (YYYY-MM-DD)',
    example: '2024-02-15',
  })
  @IsNotEmpty()
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({
    description: 'Preferred appointment time (ISO string)',
    example: '2024-02-15T10:00:00Z',
  })
  @IsNotEmpty()
  @IsDateString()
  appointmentTime: string;

  @ApiPropertyOptional({
    description: 'Special requirements or accessibility needs',
    example: 'Wheelchair access needed',
  })
  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @ApiProperty({
    description: 'User confirms the appointment details',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  confirmationAcknowledged: boolean;

  @ApiProperty({
    description: 'User gives consent for biometric capture',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  consentAcknowledged: boolean;

  @ApiProperty({
    description: 'User agrees to terms and conditions',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  termsAcknowledged: boolean;
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

  @ApiPropertyOptional({
    description:
      'Existing submission ID (if updating a draft or previous submission)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

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

  @ApiPropertyOptional({
    description: 'Biometric appointment details (optional)',
    type: 'object',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BiometricAppointmentDto)
  biometricAppointment?: BiometricAppointmentDto;
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

  @ApiPropertyOptional({
    description: 'Previous status (for tracking workflow changes)',
    enum: SubmissionStatus,
  })
  previousStatus?: SubmissionStatus;

  // Biometric tracking
  @ApiProperty({
    description: 'Whether biometrics are required for this submission',
  })
  biometricRequired: boolean;

  @ApiProperty({
    description: 'Whether biometric capture has been completed',
  })
  biometricCompleted: boolean;

  @ApiPropertyOptional({
    description: 'When biometric capture was completed',
  })
  biometricCompletedAt?: Date;

  @ApiPropertyOptional({
    description: 'Biometric appointment details if created',
    type: 'object',
  })
  biometricAppointment?: {
    id: string;
    centerId: string;
    centerName?: string;
    appointmentDate: Date;
    appointmentTime: Date;
    status: string;
    appointmentClass: string;
  };

  // Flag management
  @ApiProperty({
    description: 'Whether this submission has been flagged for review',
  })
  isFlagged: boolean;

  @ApiPropertyOptional({
    description: 'Reason why submission was flagged',
  })
  flagReason?: string;

  @ApiPropertyOptional({
    description: 'When submission was flagged',
  })
  flaggedAt?: Date;

  @ApiPropertyOptional({
    description: 'ID of staff member who flagged the submission',
  })
  flaggedBy?: string;

  // Query management
  @ApiProperty({
    description: 'Whether additional information has been requested',
  })
  isQueried: boolean;

  @ApiPropertyOptional({
    description: 'Message/question sent to applicant',
  })
  queryMessage?: string;

  @ApiPropertyOptional({
    description: 'Applicant response to query',
  })
  queryResponse?: string;

  @ApiPropertyOptional({
    description: 'When query was sent',
  })
  queriedAt?: Date;

  @ApiPropertyOptional({
    description: 'When applicant responded to query',
  })
  queryResponseAt?: Date;

  @ApiPropertyOptional({
    description: 'ID of staff member who sent the query',
  })
  queriedBy?: string;

  // Payment tracking
  @ApiProperty({
    description: 'Whether payment is required for this submission',
  })
  paymentRequired: boolean;

  @ApiProperty({
    description: 'Whether payment has been completed',
  })
  paymentCompleted: boolean;

  @ApiPropertyOptional({
    description: 'When payment was completed',
  })
  paymentCompletedAt?: Date;

  // Cancellation tracking
  @ApiProperty({
    description: 'Whether this submission has been cancelled (soft delete)',
  })
  isCancelled: boolean;

  @ApiPropertyOptional({
    description: 'When submission was cancelled',
  })
  cancelledAt?: Date;

  @ApiPropertyOptional({
    description: 'ID of user who cancelled the submission',
  })
  cancelledBy?: string;

  @ApiPropertyOptional({
    description: 'Reason for cancellation',
  })
  cancellationReason?: string;

  @ApiPropertyOptional({
    description: 'Field responses (only included in detailed views)',
    type: [FieldResponseDto],
    required: false,
  })
  responses?: FieldResponseDto[];

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
    applicationType?: {
      id: string;
      code: string;
      name: string;
      description?: string;
    };
    country?: {
      id: string;
      name: string;
      isoCode2: string;
      isoCode3: string;
      flag: string;
      logoUrl: string;
    };
    availableServiceFees?: {
      id: string;
      name: string;
      description?: string;
      amount: number;
      currency: string;
      isOptional: boolean;
    }[];
  };

  // Include user details for admin views
  @ApiPropertyOptional({ description: 'Submitter details', required: false })
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };

  // Progress information
  @ApiPropertyOptional({
    description: 'Application progress information',
    type: 'object',
    properties: {
      progressPercentage: { type: 'number', example: 75 },
      nextAction: { type: 'string', example: 'Complete payment' },
      completedSteps: { type: 'number', example: 3 },
      totalSteps: { type: 'number', example: 7 },
      stepDetails: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            stepName: { type: 'string', example: 'Personal Information' },
            isCompleted: { type: 'boolean', example: true },
            stepType: {
              type: 'string',
              enum: ['section', 'biometric', 'payment'],
            },
          },
        },
      },
    },
  })
  progress?: {
    progressPercentage: number;
    nextAction?: string;
    completedSteps: number;
    totalSteps: number;
    stepDetails: {
      stepName: string;
      isCompleted: boolean;
      stepType: 'section' | 'biometric' | 'payment';
    }[];
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
    description:
      'Search term (searches in reference number, form name, description, and user details)',
    example: 'SA25000001 or visa application',
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
    description: 'Filter by flagged status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFlagged?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by query status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isQueried?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by biometric requirement',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  biometricRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by biometric completion status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  biometricCompleted?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by payment requirement',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  paymentRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by payment completion status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  paymentCompleted?: boolean;

  @ApiPropertyOptional({
    description:
      'Filter by cancellation status (admin only - hidden from user queries)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCancelled?: boolean;

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
export class FileMetadataDto {
  @ApiProperty({
    description: 'Original file name',
    example: 'passport.pdf',
  })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({
    description: 'File description or notes',
    example: 'Front page of passport',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Additional metadata for the file',
    example: { category: 'identity', priority: 'high' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class FileUploadDto {
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
    description: 'File metadata (for single file upload)',
    example: {
      originalName: 'passport.pdf',
      size: 1024000,
      description: 'Front page of passport',
    },
    required: false,
  })
  @IsOptional()
  metadata?: any;

  @ApiProperty({
    description: 'Individual file metadata (for multiple file upload)',
    example: [
      { originalName: 'passport.pdf', description: 'Front page' },
      { originalName: 'visa.pdf', description: 'Visa page' },
    ],
    required: false,
  })
  @IsOptional()
  fileMetadata?: FileMetadataDto[];

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
}

// Draft Management DTOs
export class SaveDraftDto {
  @ApiProperty({
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  formId: string;

  @ApiPropertyOptional({
    description: 'Existing submission ID (if updating a draft)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

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
    description: 'Filter by application type code (e.g., TOURIST, BUSINESS)',
    example: 'TOURIST',
  })
  @IsOptional()
  @IsString()
  applicationType?: string;

  @ApiPropertyOptional({
    description: 'Include inactive forms (admin only)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeInactive?: boolean = false;
}

// DTOs for Flag Management
export class FlagSubmissionDto {
  @ApiProperty({
    description: 'Reason for flagging the submission',
    example: 'Suspicious document formatting detected',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the flag',
    example: 'Requires manual document verification',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// DTOs for Query Management
export class QuerySubmissionDto {
  @ApiProperty({
    description: 'Message/question to send to the applicant',
    example: 'Please provide a clearer copy of your passport photo page',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  message: string;
}

export class RespondToQueryDto {
  @ApiProperty({
    description: 'Applicant response to the query',
    example: 'I have uploaded a new copy of my passport photo page',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  response: string;
}

// DTOs for Status Management
export class UpdateSubmissionStatusDto {
  @ApiProperty({
    description: 'New status for the submission',
    enum: SubmissionStatus,
    example: SubmissionStatus.UNDER_REVIEW,
  })
  @IsNotEmpty()
  @IsEnum(SubmissionStatus)
  status: SubmissionStatus;

  @ApiPropertyOptional({
    description: 'Reason for status change',
    example: 'All documents verified and payment confirmed',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the status change',
    example: 'Ready for embassy processing',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// DTO for Status History
export class SubmissionStatusLogDto {
  @ApiProperty({ description: 'Status log ID' })
  id: string;

  @ApiProperty({ description: 'Submission ID' })
  submissionId: string;

  @ApiPropertyOptional({
    description: 'Previous status',
    enum: SubmissionStatus,
  })
  fromStatus?: SubmissionStatus;

  @ApiProperty({
    description: 'New status',
    enum: SubmissionStatus,
  })
  toStatus: SubmissionStatus;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'User who changed the status' })
  changedBy?: string;

  @ApiProperty({ description: 'When the status was changed' })
  changedAt: Date;
}

// DTO for Cancelling Submissions
export class CancelSubmissionDto {
  @ApiProperty({
    description: 'Reason for cancelling the application',
    example: 'Travel plans changed',
    maxLength: 500,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;
}
