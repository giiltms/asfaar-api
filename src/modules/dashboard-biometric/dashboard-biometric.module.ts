import { Module } from '@nestjs/common';
import { DashboardBiometricController } from './dashboard-biometric.controller';
import { BiometricCaptureService } from '@modules/biometric-capture/services/biometric-capture.service';
import { PrismaService } from '@providers/prisma/prisma.service';
import { BiometricEncryptionService } from '@common/services/biometric-encryption.service';
import { BiometricValidationService } from '@common/services/biometric-validation.service';
import { LocalStorageService } from '@providers/localstorage/localstorage.service';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DashboardBiometricController],
  providers: [
    PrismaService,
    BiometricCaptureService,
    BiometricEncryptionService,
    BiometricValidationService,
    LocalStorageService,
  ],
})
export class DashboardBiometricModule {}
