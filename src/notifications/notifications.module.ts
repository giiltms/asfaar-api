import { Module, forwardRef } from '@nestjs/common';
import { TravelAgentLicenseNotificationsService } from './travel-agent-license-notifications.service';
import { TravelAgentUpgradeModule } from '../modules/travel-agent-upgrade/travel-agent-upgrade.module';

@Module({
  imports: [forwardRef(() => TravelAgentUpgradeModule)],
  providers: [TravelAgentLicenseNotificationsService],
  exports: [TravelAgentLicenseNotificationsService],
})
export class NotificationsModule {}
