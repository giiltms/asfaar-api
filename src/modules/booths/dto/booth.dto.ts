import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsUUID,
  Length,
  IsNumber,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { AppointmentClass } from '@prisma/client';
import { PaginationQueryDto } from '@common/dtos/pagination.dto';

export class CreateBoothDto {
  @ApiProperty({
    description: 'Booth number/identifier',
    example: 'A1',
  })
  @IsString()
  @Length(1, 10)
  boothNumber: string;

  @ApiProperty({
    description: 'Biometric center ID',
    example: 'uuid',
  })
  @IsUUID()
  centerId: string;

  @ApiProperty({
    description: 'Appointment class this booth serves',
    enum: AppointmentClass,
    example: AppointmentClass.REGULAR,
  })
  @IsEnum(AppointmentClass)
  appointmentClass: AppointmentClass;

  @ApiPropertyOptional({
    description: 'Whether booth is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether booth has camera capability',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasCamera?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether booth has fingerprint scanner',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasFingerprintScanner?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether booth has signature pad',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasSignaturePad?: boolean = false;

  @ApiPropertyOptional({
    description: 'Biometric agent user ID',
  })
  @IsOptional()
  @IsUUID()
  agentId?: string;
}

export class UpdateBoothDto {
  @ApiPropertyOptional({
    description: 'Booth number/identifier',
  })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  boothNumber?: string;

  @ApiPropertyOptional({
    description: 'Appointment class this booth serves',
    enum: AppointmentClass,
  })
  @IsOptional()
  @IsEnum(AppointmentClass)
  appointmentClass?: AppointmentClass;

  @ApiPropertyOptional({
    description: 'Whether booth is active',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether booth is occupied',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isOccupied?: boolean;

  @ApiPropertyOptional({
    description: 'Whether booth has camera capability',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasCamera?: boolean;

  @ApiPropertyOptional({
    description: 'Whether booth has fingerprint scanner',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasFingerprintScanner?: boolean;

  @ApiPropertyOptional({
    description: 'Whether booth has signature pad',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasSignaturePad?: boolean;
}

export class AssignAgentDto {
  @ApiProperty({
    description: 'Biometric agent user ID',
    example: 'uuid',
  })
  @IsUUID()
  agentId: string;
}

export class UnassignAgentDto {
  @ApiProperty({
    description: 'Reason for unassigning agent',
    example: 'End of shift',
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  reason?: string;
}

export class BoothFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by center ID',
  })
  @IsOptional()
  @IsUUID()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by appointment class',
    enum: AppointmentClass,
  })
  @IsOptional()
  @IsEnum(AppointmentClass)
  appointmentClass?: AppointmentClass;

  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by occupied status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isOccupied?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by availability (not occupied and active)',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  available?: boolean;
}

export class BoothQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by center ID',
  })
  @IsOptional()
  @IsUUID()
  centerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by appointment class',
    enum: AppointmentClass,
  })
  @IsOptional()
  @IsEnum(AppointmentClass)
  appointmentClass?: AppointmentClass;

  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by occupied status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isOccupied?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by availability (not occupied and active)',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  available?: boolean;
}

export class BoothResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  boothNumber: string;

  @ApiProperty()
  centerId: string;

  @ApiProperty({ enum: AppointmentClass })
  appointmentClass: AppointmentClass;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isOccupied: boolean;

  @ApiProperty()
  hasCamera: boolean;

  @ApiProperty()
  hasFingerprintScanner: boolean;

  @ApiProperty()
  hasSignaturePad: boolean;

  @ApiPropertyOptional()
  agentId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  createdBy?: string;

  @ApiPropertyOptional()
  lastModifiedBy?: string;

  // Computed properties
  @ApiProperty()
  isAvailable: boolean;

  @ApiProperty()
  statusDisplay: string;

  @ApiProperty()
  classDisplay: string;
}

export class BoothStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  active: number;

  @ApiProperty()
  occupied: number;

  @ApiProperty()
  available: number;

  @ApiProperty()
  byClass: {
    [AppointmentClass.REGULAR]: {
      total: number;
      available: number;
      occupied: number;
    };
    [AppointmentClass.VIP]: {
      total: number;
      available: number;
      occupied: number;
    };
    [AppointmentClass.PREMIUM]: {
      total: number;
      available: number;
      occupied: number;
    };
  };

  @ApiProperty()
  withAgent: number;

  @ApiProperty()
  withoutAgent: number;
} 