import { PartialType } from '@nestjs/swagger';
import { CreateBiometricDataDto } from './create-biometric-data.dto';

export class UpdateBiometricDataDto extends PartialType(
  CreateBiometricDataDto,
) {}
