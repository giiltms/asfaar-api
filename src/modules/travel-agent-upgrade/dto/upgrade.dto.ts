import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { TravelAgentApplicationType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateDirectorDto {
  @ApiProperty({ description: 'Director NIN' })
  @IsString()
  @Length(11, 11)
  nin: string;

  @ApiProperty({ description: 'Date of birth (ISO string)' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateBankDetailsDto {
  @ApiProperty()
  @IsString()
  bankName: string;

  @ApiProperty({ description: '3-digit bank code' })
  @IsString()
  @Length(3, 3)
  bankCode: string;

  @ApiProperty({ description: '10-digit Nigerian account number' })
  @IsString()
  @Length(10, 10)
  accountNumber: string;

  @ApiProperty()
  @IsString()
  accountName: string;
}

export enum UpgradeDocumentType {
  CAC_DOCUMENT = 'CAC_DOCUMENT',
  TAX_CLEARANCE_CERTIFICATE = 'TAX_CLEARANCE_CERTIFICATE',
  NAHCON_DOCUMENT = 'NAHCON_DOCUMENT',
  EFCC_SCUML_DOCUMENT = 'EFCC_SCUML_DOCUMENT',
  IATA_DOCUMENT = 'IATA_DOCUMENT',
}

export class UploadUpgradeDocumentDto {
  @ApiProperty({ description: 'Application ID to attach document to' })
  @IsString()
  applicationId: string;

  @ApiProperty({ enum: UpgradeDocumentType })
  @IsEnum(UpgradeDocumentType)
  documentType: UpgradeDocumentType;

  @ApiProperty({ description: 'URL of the uploaded file' })
  @IsString()
  fileUrl: string;

  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiProperty()
  @IsString()
  mimeType: string;
}

export class CreateDraftApplicationDto {
  @ApiProperty({
    enum: TravelAgentApplicationType,
    description: 'Type of travel agent application',
    example: 'REGULAR_TRAVEL_AGENT',
  })
  @IsEnum(TravelAgentApplicationType)
  applicationType: TravelAgentApplicationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  companyEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cacNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tinNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nahconLicenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dssClearanceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  efccScumlNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iataAccreditationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nantaMembershipNumber?: string;
}

export class CompleteUpgradeApplicationDto {
  @ApiProperty({
    enum: TravelAgentApplicationType,
    description: 'Type of travel agent application',
    example: 'REGULAR_TRAVEL_AGENT',
  })
  @IsEnum(TravelAgentApplicationType)
  applicationType: TravelAgentApplicationType;

  @ApiProperty()
  @IsString()
  cacNumber: string;

  @ApiProperty()
  @IsString()
  tinNumber: string;

  @ApiPropertyOptional()
  @ValidateIf(
    (o) =>
      o.applicationType === TravelAgentApplicationType.NAHCON_REGISTERED_AGENT,
  )
  @IsString()
  nahconLicenseNumber?: string;

  @ApiProperty()
  @IsString()
  dssClearanceNumber: string;

  @ApiProperty()
  @IsString()
  efccScumlNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iataAccreditationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nantaMembershipNumber?: string;

  @ApiProperty({ type: CreateBankDetailsDto })
  @ValidateNested()
  @Type(() => CreateBankDetailsDto)
  bankDetails: CreateBankDetailsDto;

  @ApiProperty({ type: [CreateDirectorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDirectorDto)
  directors: CreateDirectorDto[];
}

export class CreateUpgradeApplicationDto {
  @ApiProperty({
    enum: TravelAgentApplicationType,
    description: 'Type of travel agent application',
    example: 'REGULAR_TRAVEL_AGENT',
  })
  @IsEnum(TravelAgentApplicationType)
  applicationType: TravelAgentApplicationType;

  @ApiProperty()
  @IsString()
  companyName: string;

  @ApiProperty()
  @IsEmail()
  companyEmail: string;

  @ApiProperty()
  @IsString()
  companyPhone: string;

  @ApiProperty()
  @IsString()
  cacNumber: string;

  @ApiProperty()
  @IsString()
  tinNumber: string;

  @ApiProperty()
  @IsString()
  nahconLicenseNumber: string;

  @ApiProperty()
  @IsString()
  dssClearanceNumber: string;

  @ApiProperty()
  @IsString()
  efccScumlNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iataAccreditationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nantaMembershipNumber?: string;

  @ApiProperty({ type: CreateBankDetailsDto })
  @ValidateNested()
  @Type(() => CreateBankDetailsDto)
  bankDetails: CreateBankDetailsDto;

  @ApiProperty({ type: [CreateDirectorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDirectorDto)
  directors: CreateDirectorDto[];
}
