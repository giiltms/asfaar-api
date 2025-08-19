import { Module } from '@nestjs/common';
import { BiometricDataService } from './biometric-data.service';
import { BiometricDataController } from './biometric-data.controller';
import { PrismaModule } from '../../providers/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { LocalStorageModule } from '@providers/localstorage/localstorage.module';

@Module({
  imports: [PrismaModule, AuthModule, LocalStorageModule],
  controllers: [BiometricDataController],
  providers: [BiometricDataService],
  exports: [BiometricDataService],
})
export class BiometricDataModule {}
