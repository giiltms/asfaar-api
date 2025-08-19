import {
  IsEnum,
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FingerPositionDto {
  LEFT_THUMB = 'LEFT_THUMB',
  LEFT_INDEX = 'LEFT_INDEX',
  LEFT_MIDDLE = 'LEFT_MIDDLE',
  LEFT_RING = 'LEFT_RING',
  LEFT_LITTLE = 'LEFT_LITTLE',
  RIGHT_THUMB = 'RIGHT_THUMB',
  RIGHT_INDEX = 'RIGHT_INDEX',
  RIGHT_MIDDLE = 'RIGHT_MIDDLE',
  RIGHT_RING = 'RIGHT_RING',
  RIGHT_LITTLE = 'RIGHT_LITTLE',
}

export enum FingerTemplateFormatDto {
  ISO_19794_2 = 'ISO-19794-2',
  ANSI_378 = 'ANSI-378',
  PROPRIETARY = 'PROPRIETARY',
}

export class FingerprintFingerDto {
  @ApiProperty({
    enum: FingerPositionDto,
    description: 'Position of the finger',
  })
  @IsEnum(FingerPositionDto)
  fingerPosition: FingerPositionDto;

  @ApiPropertyOptional({ description: 'Human readable finger name' })
  @IsOptional()
  @IsString()
  fingerName?: string;

  @ApiPropertyOptional({ description: 'Encrypted fingerprint template data' })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Hash for integrity verification' })
  @IsOptional()
  @IsString()
  templateHash?: string;

  @ApiPropertyOptional({
    description: 'Template format',
    enum: FingerTemplateFormatDto,
  })
  @IsOptional()
  @IsEnum(FingerTemplateFormatDto)
  templateFormat?: FingerTemplateFormatDto;

  @ApiPropertyOptional({
    description: 'Quality score for this finger (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @ApiPropertyOptional({
    description: 'Number of capture attempts',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  captureAttempts?: number;

  @ApiPropertyOptional({
    description: 'Whether this finger meets quality standards',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAcceptable?: boolean;

  @ApiPropertyOptional({ description: 'Device used for this finger' })
  @IsOptional()
  @IsString()
  captureDevice?: string;

  @ApiPropertyOptional({
    description: 'Capture method (optical, capacitive, ultrasonic)',
  })
  @IsOptional()
  @IsString()
  captureMethod?: string;

  @ApiPropertyOptional({ description: 'Additional finger-specific metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
