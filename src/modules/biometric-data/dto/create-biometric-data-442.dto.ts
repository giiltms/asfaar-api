import { IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateBiometricDataDto } from './create-biometric-data.dto';
import { FingerprintFingerDto } from './fingerprint-finger.dto';

export class CreateBiometricData442Dto extends CreateBiometricDataDto {
  @ApiPropertyOptional({
    description:
      '442 fingerprint data - 4 left fingers, 4 right fingers, 2 thumbs',
    type: [FingerprintFingerDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FingerprintFingerDto)
  fingerprintFingers?: FingerprintFingerDto[];
}
