import { Module } from '@nestjs/common';
import { BiometricCaptureController } from './biometric-capture.controller';
import { BiometricCaptureHistoryController } from './controllers/biometric-capture-history.controller';
import { BiometricCaptureService } from './services/biometric-capture.service';
import { BiometricCaptureHistoryService } from './services/biometric-capture-history.service';
import { BiometricEncryptionService } from '@common/services/biometric-encryption.service';
import { BiometricValidationService } from '@common/services/biometric-validation.service';
import { UserContextService } from '@common/services/user-context.service';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { LocalStorageModule } from '@providers/localstorage/localstorage.module';

@Module({
  imports: [PrismaModule, AuthModule, LocalStorageModule],
  controllers: [BiometricCaptureController, BiometricCaptureHistoryController],
  providers: [
    BiometricCaptureService,
    BiometricCaptureHistoryService,
    BiometricEncryptionService,
    BiometricValidationService,
    UserContextService,
  ],
  exports: [
    BiometricCaptureService,
    BiometricCaptureHistoryService,
    BiometricEncryptionService,
    BiometricValidationService,
  ],
})
export class BiometricCaptureModule {}
