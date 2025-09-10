import { Module } from '@nestjs/common';
import { BiometricCaptureController } from './biometric-capture.controller';
import { BiometricCaptureService } from './services/biometric-capture.service';
import { BiometricEncryptionService } from '@common/services/biometric-encryption.service';
import { BiometricValidationService } from '@common/services/biometric-validation.service';
import { UserContextService } from '@common/services/user-context.service';
import { PrismaModule } from '@providers/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BiometricCaptureController],
  providers: [
    BiometricCaptureService,
    BiometricEncryptionService,
    BiometricValidationService,
    UserContextService,
  ],
  exports: [
    BiometricCaptureService,
    BiometricEncryptionService,
    BiometricValidationService,
  ],
})
export class BiometricCaptureModule {}
