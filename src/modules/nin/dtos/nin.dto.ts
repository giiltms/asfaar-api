import { IsString, IsNotEmpty, Length, Matches, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class VerifyNinDto {
  @ApiProperty({
    description: 'National Identification Number (11 digits)',
    example: '12345678901',
    minLength: 11,
    maxLength: 11,
  })
  @IsString()
  @IsNotEmpty({ message: 'NIN is required' })
  @Length(11, 11, { message: 'NIN must be exactly 11 digits' })
  @Matches(/^\d{11}$/, { message: 'NIN must contain only digits' })
  @Transform(({ value }) => value?.toString().trim())
  nin: string;

  @ApiPropertyOptional({
    description: 'Force verification even if NIN exists in database',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  forceVerification?: boolean = false;
}

export class AddressDto {
  @ApiProperty({ description: 'Address line 1' })
  line1: string;

  @ApiProperty({ description: 'Address line 2' })
  line2: string;

  @ApiProperty({ description: 'City' })
  city: string;

  @ApiProperty({ description: 'State' })
  state: string;

  @ApiProperty({ description: 'Local Government Area' })
  lga: string;

  @ApiProperty({ description: 'Postal code' })
  postalCode: string;

  @ApiProperty({ description: 'Country' })
  country: string;
}

export class BirthPlaceDto {
  @ApiProperty({ description: 'State of birth' })
  state: string;

  @ApiProperty({ description: 'LGA of birth' })
  lga: string;
}

export class VerificationMetadataDto {
  @ApiProperty({ description: 'Verification method used' })
  verificationMethod: string;

  @ApiProperty({ description: 'Timestamp of verification' })
  timestamp: string;

  @ApiPropertyOptional({ description: 'Whether this was a live verification' })
  liveVerification?: boolean;

  @ApiPropertyOptional({ description: 'API method that succeeded' })
  methodUsed?: string;

  @ApiPropertyOptional({ description: 'API response status' })
  apiResponse?: string;

  @ApiPropertyOptional({ description: 'API key used for verification' })
  apiKeyUsed?: string;

  @ApiPropertyOptional({ description: 'Merchant key used for verification' })
  merchantKeyUsed?: string;

  @ApiPropertyOptional({ description: 'Reason for test mode' })
  reason?: string;

  @ApiPropertyOptional({ description: 'Warning message if any' })
  warning?: string;
}

export class GetNinVerificationDto {
  @ApiProperty({
    description: 'National Identification Number to retrieve',
    example: '12345678901',
  })
  @IsString()
  @IsNotEmpty()
  @Length(11, 11, { message: 'NIN must be exactly 11 digits' })
  @Matches(/^\d{11}$/, { message: 'NIN must contain only digits' })
  nin: string;
}

export class NinVerificationHistoryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => Math.min(parseInt(value) || 10, 100))
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by verification method',
    enum: ['youverify', 'test_mode', 'manual'],
  })
  @IsOptional()
  @IsString()
  verificationMethod?: string;

  @ApiPropertyOptional({
    description: 'Filter by verification status',
    enum: ['verified', 'failed', 'pending'],
  })
  @IsOptional()
  @IsString()
  verificationStatus?: string;
}

export class NinVerificationDataDto {
  @ApiProperty({ description: 'National Identification Number' })
  nin: string;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiProperty({ description: 'Middle name' })
  middleName: string;

  @ApiProperty({ description: 'Last name' })
  lastName: string;

  @ApiProperty({ description: 'Full name' })
  fullName: string;

  @ApiProperty({ description: 'Date of birth' })
  dateOfBirth: string;

  @ApiProperty({ description: 'Gender' })
  gender: string;

  @ApiProperty({ description: 'Phone number' })
  phoneNumber: string;

  @ApiProperty({ description: 'Whether the NIN is verified' })
  verified: boolean;

  @ApiProperty({ description: 'Unique verification ID' })
  verificationId: string;

  @ApiProperty({ description: 'Verification status' })
  verificationStatus: string;

  @ApiProperty({ description: 'Verification date' })
  verificationDate: string;

  @ApiProperty({ description: 'Verification method used' })
  verificationMethod: string;

  @ApiPropertyOptional({ description: 'Photo URL if available' })
  photo?: string | null;

  @ApiProperty({ description: 'Address information' })
  address: AddressDto;

  @ApiProperty({ description: 'Birth place information' })
  birthPlace: BirthPlaceDto;

  @ApiProperty({ description: 'Tracking ID' })
  trackingId: string;

  @ApiProperty({ description: 'Verified phone number' })
  verifiedPhoneNumber: string;
}


export class NinVerificationResponseDto {
  @ApiProperty({ description: 'Whether the verification was successful' })
  success: boolean;

  @ApiProperty({ description: 'Verification result data' })
  data: NinVerificationDataDto;

  @ApiProperty({ description: 'Additional metadata about the verification' })
  metadata: VerificationMetadataDto;
}