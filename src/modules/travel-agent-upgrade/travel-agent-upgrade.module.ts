import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { TravelAgentUpgradeService } from './travel-agent-upgrade.service';
import { TravelAgentLicenseService } from './travel-agent-license.service';
import { TravelAgentUpgradeController } from './travel-agent-upgrade.controller';
import { AdminTravelAgentUpgradeController } from './travel-agent-upgrade.admin.controller';
import { LicenseNumberService } from '@common/services/license-number.service';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => NotificationsModule)],
  controllers: [
    TravelAgentUpgradeController,
    AdminTravelAgentUpgradeController,
  ],
  providers: [
    TravelAgentUpgradeService,
    TravelAgentLicenseService,
    LicenseNumberService,
  ],
  exports: [TravelAgentUpgradeService, TravelAgentLicenseService],
})
export class TravelAgentUpgradeModule {}
