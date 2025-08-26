import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsJSON,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
  Min,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
import { FieldType, FeeType, PaymentProvider } from '@prisma/client';

// Field Option DTOs (base level - no dependencies)
export class CreateFieldOptionDto {
  @ApiProperty({
    description: 'Option label',
    example: 'Married',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @ApiProperty({
    description: 'Option value',
    example: 'MARRIED',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  value: string;

  @ApiProperty({
    description: 'Option order',
    example: 1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  order: number;
}

export class UpdateFieldOptionDto extends PartialType(CreateFieldOptionDto) {}

export class FieldOptionDto {
  @ApiProperty({ description: 'Option ID' })
  id: string;

  @ApiProperty({ description: 'Option label' })
  label: string;

  @ApiProperty({ description: 'Option value' })
  value: string;

  @ApiProperty({ description: 'Option order' })
  order: number;
}

// Field DTOs (depends on FieldOption)
export class CreateFormFieldDto {
  @ApiProperty({
    description: 'Field label',
    example: 'Full Name',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label: string;

  @ApiProperty({
    description: 'Field name (unique identifier)',
    example: 'full_name',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Field type',
    enum: FieldType,
    example: FieldType.TEXT,
  })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiProperty({
    description: 'Whether field is required',
    example: true,
    default: false,
  })
  @IsBoolean()
  required = false;

  @ApiPropertyOptional({
    description: 'Field placeholder text',
    example: 'Enter your full name',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;

  @ApiPropertyOptional({
    description: 'Default field value',
    example: '',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultValue?: string;

  @ApiPropertyOptional({
    description: 'Field validation rules (JSON)',
    example: { minLength: 2, maxLength: 100, pattern: '^[A-Za-z\\s]+$' },
  })
  @IsOptional()
  @IsObject()
  validation?: any;

  @ApiPropertyOptional({
    description: 'Field configuration (JSON)',
    example: { rows: 3, prefix: '₦', suffix: '.00' },
  })
  @IsOptional()
  @IsObject()
  config?: any;

  @ApiPropertyOptional({
    description: 'Field visibility conditions (JSON)',
    example: { field: 'marital_status', operator: 'equals', value: 'married' },
  })
  @IsOptional()
  @IsObject()
  visibilityCondition?: any;

  @ApiPropertyOptional({
    description: 'Field calculation rules (JSON)',
    example: {
      expression: '${income} - ${expenses}',
      dependencies: ['income', 'expenses'],
    },
  })
  @IsOptional()
  @IsObject()
  calculation?: any;

  @ApiPropertyOptional({
    description: 'Additional field metadata (JSON)',
    example: { captureTimestamp: true, captureLocation: false },
  })
  @IsOptional()
  @IsObject()
  metadata?: any;

  @ApiPropertyOptional({
    description: 'Field data source configuration (JSON)',
    example: { endpoint: '/api/states', valueField: 'id', labelField: 'name' },
  })
  @IsOptional()
  @IsObject()
  source?: any;

  @ApiPropertyOptional({
    description: 'File upload configuration (JSON)',
    example: {
      accept: ['.pdf', '.jpg', '.png'],
      maxSize: '5MB',
      multiple: false,
    },
  })
  @IsOptional()
  @IsObject()
  fileTypes?: any;

  @ApiPropertyOptional({
    description: 'Content for INFO and AGREEMENT fields (supports HTML)',
    example:
      '<p><strong>Important Notice:</strong></p><p>This is important information for the user to read.</p>',
    maxLength: 10000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @ApiProperty({
    description: 'Field order within group',
    example: 1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiPropertyOptional({
    description: 'Field options (for SELECT/MULTISELECT fields)',
    type: [CreateFieldOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFieldOptionDto)
  options?: CreateFieldOptionDto[];
}

export class UpdateFormFieldDto extends PartialType(CreateFormFieldDto) {}

export class FormFieldDto {
  @ApiProperty({ description: 'Field ID' })
  id: string;

  @ApiProperty({ description: 'Field label' })
  label: string;

  @ApiProperty({ description: 'Field name' })
  name: string;

  @ApiProperty({ description: 'Field type', enum: FieldType })
  type: FieldType;

  @ApiProperty({ description: 'Whether field is required' })
  required: boolean;

  @ApiProperty({ description: 'Field placeholder', required: false })
  placeholder?: string;

  @ApiProperty({ description: 'Default value', required: false })
  defaultValue?: string;

  @ApiProperty({ description: 'Validation rules', required: false })
  validation?: any;

  @ApiProperty({ description: 'Field configuration', required: false })
  config?: any;

  @ApiProperty({ description: 'Visibility conditions', required: false })
  visibilityCondition?: any;

  @ApiProperty({ description: 'Calculation rules', required: false })
  calculation?: any;

  @ApiProperty({ description: 'Field metadata', required: false })
  metadata?: any;

  @ApiProperty({
    description: 'Field data source configuration',
    required: false,
  })
  source?: any;

  @ApiProperty({
    description: 'File upload configuration',
    required: false,
  })
  fileTypes?: any;

  @ApiProperty({
    description: 'Content for INFO and AGREEMENT fields',
    required: false,
  })
  content?: string;

  @ApiProperty({ description: 'Field order' })
  order: number;

  @ApiProperty({ description: 'Field options', type: [FieldOptionDto] })
  options: FieldOptionDto[];
}

// Group DTOs (depends on Field)
export class CreateInputGroupDto {
  @ApiPropertyOptional({
    description: 'Group title',
    example: 'Personal Details',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Group description',
    example: 'Basic personal information',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Group order',
    example: 1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiPropertyOptional({
    description: 'Whether this group is repeatable',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  repeatable?: boolean;

  @ApiPropertyOptional({
    description: 'Custom configuration for frontend rendering (JSON)',
    example: { layout: 'grid', columns: 2, collapsible: true },
  })
  @IsOptional()
  @IsObject()
  config?: any;

  @ApiPropertyOptional({
    description: 'Form fields in this group',
    type: [CreateFormFieldDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormFieldDto)
  fields?: CreateFormFieldDto[];
}

export class UpdateInputGroupDto extends PartialType(CreateInputGroupDto) {}

export class InputGroupDto {
  @ApiProperty({ description: 'Group ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Group title' })
  title?: string;

  @ApiPropertyOptional({ description: 'Group description' })
  description?: string;

  @ApiProperty({ description: 'Group order' })
  order: number;

  @ApiProperty({ description: 'Whether group is repeatable' })
  repeatable: boolean;

  @ApiPropertyOptional({
    description: 'Custom configuration for frontend rendering (JSON)',
    example: { layout: 'grid', columns: 2, collapsible: true },
    required: false,
  })
  config?: any;

  @ApiProperty({ description: 'Form fields', type: [FormFieldDto] })
  fields: FormFieldDto[];
}

// Section DTOs (depends on Group)
export class CreateFormSectionDto {
  @ApiProperty({
    description: 'Section title',
    example: 'Personal Information',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: 'Section description',
    example: 'Please provide your personal details',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Section order',
    example: 1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  order: number;

  @ApiPropertyOptional({
    description: 'Custom configuration for frontend rendering (JSON)',
    example: { collapsible: true, icon: 'user', theme: 'info' },
  })
  @IsOptional()
  @IsObject()
  config?: any;

  @ApiPropertyOptional({
    description: 'Input groups in this section',
    type: [CreateInputGroupDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInputGroupDto)
  groups?: CreateInputGroupDto[];
}

export class UpdateFormSectionDto extends PartialType(CreateFormSectionDto) {}

export class FormSectionDto {
  @ApiProperty({ description: 'Section ID' })
  id: string;

  @ApiProperty({ description: 'Section title' })
  title: string;

  @ApiProperty({ description: 'Section description', required: false })
  description?: string;

  @ApiProperty({ description: 'Section order' })
  order: number;

  @ApiPropertyOptional({
    description: 'Custom configuration for frontend rendering (JSON)',
    example: { collapsible: true, icon: 'user', theme: 'info' },
    required: false,
  })
  config?: any;

  @ApiProperty({ description: 'Input groups', type: [InputGroupDto] })
  groups: InputGroupDto[];
}

// Form DTOs (depends on Section)
export class CreateFormDto {
  @ApiProperty({
    description: 'Form name',
    example: 'Visa Application Form',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    description: 'Form description',
    example: 'Complete visa application form for tourist visa',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Target country ID for country-specific forms',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  countryId?: string;

  @ApiPropertyOptional({
    description: 'Application type CODE linked to this form (e.g., TOURIST)',
    example: 'TOURIST',
  })
  @IsOptional()
  @IsString()
  applicationType?: string;

  @ApiPropertyOptional({
    description: 'Form sections',
    type: [CreateFormSectionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormSectionDto)
  sections?: CreateFormSectionDto[];
}

export class UpdateFormDto extends PartialType(CreateFormDto) {}

// Service Fee DTO (declared before FormDto to avoid forward reference issues)
export class FormServiceFeeDto {
  @ApiProperty({ description: 'Service fee ID' })
  id: string;

  @ApiProperty({ description: 'Service fee name' })
  name: string;

  @ApiProperty({ description: 'Service fee description' })
  description?: string;

  @ApiProperty({ description: 'Amount in kobo' })
  amount: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiPropertyOptional({
    description: 'Type of service fee',
    enum: FeeType,
    example: FeeType.APPLICATION,
  })
  feeType?: FeeType;

  @ApiPropertyOptional({
    description: 'Allowed payment providers',
    type: [String],
    enum: PaymentProvider,
  })
  providers?: PaymentProvider[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { customField: 'value' },
  })
  metadata?: any;

  @ApiProperty({ description: 'Whether fee is optional' })
  isOptional: boolean;

  @ApiProperty({ description: 'Whether fee is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class FormDto {
  @ApiProperty({ description: 'Form ID' })
  id: string;

  @ApiProperty({ description: 'Form name' })
  name: string;

  @ApiProperty({ description: 'Form description', required: false })
  description?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Application type info', required: false })
  applicationType?: { code: string; name: string } | null;

  @ApiProperty({ description: 'Form sections', type: [FormSectionDto] })
  sections: FormSectionDto[];

  @ApiProperty({ description: 'Number of submissions' })
  submissionCount?: number;

  @ApiProperty({
    description: 'Service fees associated with this form',
    type: [FormServiceFeeDto],
  })
  serviceFees?: FormServiceFeeDto[];

  @ApiPropertyOptional({
    description: 'Country information',
    type: 'object',
    properties: {
      id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
      name: { type: 'string', example: 'Saudi Arabia' },
      isoCode2: { type: 'string', example: 'SA' },
      flag: { type: 'string', example: '🇸🇦' },
      logoUrl: {
        type: 'string',
        example: '/uploads/countries/logos/sa-logo.png',
      },
    },
  })
  country?: {
    id: string;
    name: string;
    isoCode2: string;
    flag?: string;
    logoUrl?: string;
  };
}

// Builder DTOs for adding components
export class AddSectionToFormDto {
  @ApiProperty({ description: 'Form ID' })
  @IsUUID()
  formId: string;

  @ApiProperty({ description: 'Section data', type: CreateFormSectionDto })
  @ValidateNested()
  @Type(() => CreateFormSectionDto)
  section: CreateFormSectionDto;
}

export class AddGroupToSectionDto {
  @ApiProperty({ description: 'Section ID' })
  @IsUUID()
  sectionId: string;

  @ApiProperty({ description: 'Group data', type: CreateInputGroupDto })
  @ValidateNested()
  @Type(() => CreateInputGroupDto)
  group: CreateInputGroupDto;
}

export class AddFieldToGroupDto {
  @ApiProperty({ description: 'Group ID' })
  @IsUUID()
  groupId: string;

  @ApiProperty({ description: 'Field data', type: CreateFormFieldDto })
  @ValidateNested()
  @Type(() => CreateFormFieldDto)
  field: CreateFormFieldDto;
}

// Summary DTOs
export class FormSummaryDto {
  @ApiProperty({ description: 'Form ID' })
  id: string;

  @ApiProperty({ description: 'Form name' })
  name: string;

  @ApiProperty({ description: 'Form description', required: false })
  description?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Number of sections' })
  sectionCount: number;

  @ApiProperty({ description: 'Number of fields' })
  fieldCount: number;

  @ApiProperty({ description: 'Number of submissions' })
  submissionCount: number;

  @ApiProperty({ description: 'Form status' })
  status: 'draft' | 'published' | 'archived';

  @ApiPropertyOptional({
    description: 'Application type information',
    type: 'object',
    properties: {
      code: { type: 'string', example: 'TOURIST' },
      name: { type: 'string', example: 'Tourist Visa' },
    },
  })
  applicationType?: {
    code: string;
    name: string;
  };

  @ApiPropertyOptional({
    description: 'Country information',
    type: 'object',
    properties: {
      id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
      name: { type: 'string', example: 'Saudi Arabia' },
      isoCode2: { type: 'string', example: 'SA' },
      flag: { type: 'string', example: '🇸🇦' },
      logoUrl: {
        type: 'string',
        example: '/uploads/countries/logos/sa-logo.png',
      },
    },
  })
  country?: {
    id: string;
    name: string;
    isoCode2: string;
    flag?: string;
    logoUrl?: string;
  };
}

// Query DTOs
export class FormQueryDto {
  @ApiPropertyOptional({
    description: 'Search term',
    example: 'visa',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by country ID',
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
  @MaxLength(2)
  countryCode?: string;

  @ApiPropertyOptional({
    description: 'Filter by application type CODE (e.g., TOURIST)',
    example: 'TOURIST',
  })
  @IsOptional()
  @IsString()
  applicationType?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
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
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
    enum: ['name', 'createdAt', 'submissionCount'],
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

// Service Fee Association DTOs
export class AssociateServiceFeesDto {
  @ApiProperty({
    description: 'Array of service fee IDs to associate with the form',
    type: [String],
    example: ['fee-id-1', 'fee-id-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID(4, { each: true })
  serviceFeeIds: string[];
}

export class UpdateFormServiceFeesDto {
  @ApiProperty({
    description:
      'Array of service fee IDs that should be associated with the form',
    type: [String],
    example: ['fee-id-1', 'fee-id-2'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID(4, { each: true })
  serviceFeeIds: string[];
}
