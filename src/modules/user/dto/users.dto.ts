import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsDateString,
  IsUUID,
  IsPhoneNumber,
  IsUrl,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Gender, Roles, Status } from '@prisma/client';

// User DTO for responses - Documentation only (entities handle serialization)
export class UserDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: '+1234567890', required: false })
  phone?: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Michael', required: false })
  middleName?: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'johndoe', required: false })
  username?: string;

  @ApiProperty({ enum: Gender, required: false })
  gender?: Gender;

  @ApiProperty({ example: '1990-01-01', required: false })
  dateOfBirth?: Date;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  avatar?: string;

  @ApiProperty({
    example: 'Software engineer passionate about technology',
    required: false,
  })
  bio?: string;

  @ApiProperty({ example: 'https://johndoe.dev', required: false })
  website?: string;

  @ApiProperty({
    description: 'National Identity Number',
    example: '12345678901',
    required: false,
  })
  nin?: string;

  @ApiProperty({
    description: 'User state or province',
    example: 'Lagos',
    required: false,
  })
  state?: string;

  @ApiProperty({
    description: 'Local Government Area',
    example: 'Eti-Osa',
    required: false,
  })
  lga?: string;

  @ApiProperty({ example: 'UTC', required: false })
  timezone?: string;

  @ApiProperty({ example: 'en', required: false })
  locale?: string;

  @ApiProperty({ enum: Roles, isArray: true })
  roles: Roles[];

  @ApiProperty({ enum: Status })
  status: Status;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00Z', required: false })
  lastLoginAt?: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  updatedAt: Date;

  @ApiProperty({ example: 'John Doe', description: 'Computed full name' })
  fullName?: string;
}

// User Profile DTO
export class UserProfileDto {
  @ApiProperty({ example: 'Acme Corp', required: false })
  company?: string;

  @ApiProperty({ example: 'Senior Developer', required: false })
  jobTitle?: string;

  @ApiProperty({ example: 'Computer Science Degree', required: false })
  education?: string;

  @ApiProperty({
    example: ['JavaScript', 'TypeScript', 'Node.js'],
    required: false,
  })
  skills?: string[];

  @ApiProperty({ example: ['Programming', 'Reading'], required: false })
  interests?: string[];

  @ApiProperty({
    example: { linkedin: 'https://linkedin.com/in/johndoe' },
    required: false,
  })
  socialLinks?: Record<string, any>;

  @ApiProperty({
    example: { street: '123 Main St', city: 'New York', state: 'NY' },
    required: false,
  })
  address?: Record<string, any>;
}

// Create User DTO
export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Michael', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  middleName?: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'johndoe', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @ApiProperty({ enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    example: '1990-01-01T00:00:00.000Z',
    description:
      'Date of birth in ISO-8601 format. You can also send just date (YYYY-MM-DD) and it will be converted.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => {
    if (!value) return value;
    // If it's a date string without time, add midnight UTC time
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return `${value}T00:00:00.000Z`;
    }
    // If it's already a proper ISO string, return as is
    return value;
  })
  dateOfBirth?: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ enum: Roles, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(Roles, { each: true })
  roles?: Roles[];

  @ApiProperty({
    description: 'List of center IDs to assign to the user',
    example: ['center-uuid-1', 'center-uuid-2'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  centerIds?: string[];
}

// Update User DTO
export class UpdateUserDto {
  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ example: 'Michael', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  middleName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({ example: 'johndoe', required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @ApiProperty({ enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    example: '1990-01-01T00:00:00.000Z',
    description:
      'Date of birth in ISO-8601 format. You can also send just date (YYYY-MM-DD) and it will be converted.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => {
    if (!value) return value;
    // If it's a date string without time, add midnight UTC time
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return `${value}T00:00:00.000Z`;
    }
    // If it's already a proper ISO string, return as is
    return value;
  })
  dateOfBirth?: string;

  @ApiProperty({
    example: 'Software engineer passionate about technology',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({ example: 'https://johndoe.dev', required: false })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({
    description: 'National Identity Number',
    example: '12345678901',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nin?: string;

  @ApiProperty({
    description: 'User state or province',
    example: 'Lagos',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({
    description: 'Local Government Area',
    example: 'Eti-Osa',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lga?: string;

  @ApiProperty({ example: 'UTC', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ example: 'en', required: false })
  @IsOptional()
  @IsString()
  locale?: string;
}

// User Summary DTO (for lists)
export class UserSummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  avatar?: string;

  @ApiProperty({ enum: Roles, isArray: true })
  roles: Roles[];

  @ApiProperty({ enum: Status })
  status: Status;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  createdAt: Date;
}

// List Users DTO for pagination queries
export class ListUsersDTO {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ example: 'john' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    enum: Roles,
    description: 'Filter users by their roles',
  })
  @IsOptional()
  @IsEnum(Roles)
  role?: Roles;

  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  isVerified?: boolean;
}

// Update User Country DTO
export class UpdateUserCountryDto {
  @ApiProperty({
    description: 'Country ID to assign to the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  countryId: string;
}
