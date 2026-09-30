import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { BiometricCaptureModule } from '@modules/biometric-capture/biometric-capture.module';
import { AgicController } from './agic.controller';
import { AgicClientService } from './agic-client.service';
import { AgicImportService } from './agic-import.service';
import { AgicTargetsService } from './agic-targets.service';
import { AgicBiometricSyncService } from './agic-biometric-sync.service';
import { AgicPhotoService } from './agic-photo.service';

/**
 * Integration with AGIC (African Gulf Investment Consult), which takes visa
 * applications and payment and sends applicants to ASFAAR for biometrics.
 * See AGIC_INTEGRATION.md.
 */
@Module({
  imports: [PrismaModule, AuthModule, BiometricCaptureModule],
  controllers: [AgicController],
  providers: [
    // Built by hand: its constructor takes fetch and a config loader, which
    // tests replace and Nest cannot inject.
    { provide: AgicClientService, useFactory: () => new AgicClientService() },
    AgicTargetsService,
    AgicPhotoService,
    AgicImportService,
    AgicBiometricSyncService,
  ],
  exports: [AgicBiometricSyncService],
})
export class AgicModule {}
