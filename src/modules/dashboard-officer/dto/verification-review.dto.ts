import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  NEEDS_RETAKES = 'NEEDS_RETAKES',
}

export class VerificationReviewDto {
  @ApiProperty({ description: 'Application submission ID' })
  @IsUUID()
  submissionId: string;

  @ApiProperty({ description: 'Verification status', enum: VerificationStatus })
  @IsEnum(VerificationStatus)
  verificationStatus: VerificationStatus;

  @ApiPropertyOptional({ description: 'Review notes and comments' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional({
    description: 'Rejection reason if status is REJECTED',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class ApplicationReviewDto {
  @ApiProperty({ description: 'Application reference number' })
  referenceNumber: string;

  @ApiProperty({ description: 'Submission ID' })
  submissionId: string;

  @ApiProperty({ description: 'Application status' })
  status: string;

  @ApiProperty({ description: 'Date submitted' })
  submittedAt: string;

  @ApiProperty({ description: 'Applicant information' })
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nin: string;
    dateOfBirth: string;
    gender: string;
    state: string;
    lga: string;
  };

  @ApiProperty({ description: 'Form information' })
  form: {
    id: string;
    name: string;
    country: {
      name: string;
      isoCode2: string;
      isoCode3: string;
      flag: string;
      logoUrl: string;
    };
  };

  @ApiProperty({
    description: 'Form field responses - the actual data entered by applicant',
  })
  formResponses: Array<{
    fieldId: string;
    fieldName: string;
    fieldLabel: string;
    fieldType: string;
    sectionName: string;
    groupName: string;
    value: any; // The actual value entered by the applicant
    fileUrls: string[]; // For file upload fields
    isRequired: boolean;
    displayOrder: number;
  }>;

  @ApiProperty({ description: 'NIN verification data' })
  ninVerification: {
    id: string;
    nin: string;
    firstName: string;
    lastName: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber: string;
    photo: string;
    verificationStatus: string;
    verificationDate: string;
    address: {
      line1: string;
      city: string;
      state: string;
      lga: string;
      country: string;
    };
  };

  @ApiProperty({ description: 'Biometric data' })
  biometricData: {
    id: string;
    photoUrl: string;
    photoQualityScore: number;
    fingerprintQualityScore: number;
    overallQualityScore: number;
    isVerified: boolean;
    verificationStatus: string;
    capturedAt: string;
    capturedBy: string;
    captureDevice: string;
    fingerprintFingers: Array<{
      fingerPosition: string;
      fingerName: string;
      qualityScore: number;
      isAcceptable: boolean;
      capturedAt: string;
    }>;
  };

  @ApiProperty({ description: 'User profile photo' })
  userProfilePhoto: string;

  @ApiProperty({ description: 'Appointment information' })
  appointment: {
    id: string;
    appointmentDate: string;
    center: {
      name: string;
      address: string;
      city: string;
      state: string;
    };
    status: string;
  };
}

export class VerificationReviewListDto {
  @ApiProperty({ description: 'List of applications for review' })
  applications: ApplicationReviewDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;
}

export class VerificationStatsDto {
  @ApiProperty({ description: 'Total applications pending review' })
  pendingReview: number;

  @ApiProperty({ description: 'Total applications verified today' })
  verifiedToday: number;

  @ApiProperty({ description: 'Total applications rejected today' })
  rejectedToday: number;

  @ApiProperty({ description: 'Total applications requiring retakes' })
  needsRetakes: number;

  @ApiProperty({ description: 'Average verification time in minutes' })
  averageVerificationTime: number;
}
