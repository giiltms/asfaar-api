import { Module } from '@nestjs/common';
import { TravelAgentLicenseSchedulerService } from './travel-agent-license-scheduler.service';
import { TravelAgentUpgradeModule } from '../modules/travel-agent-upgrade/travel-agent-upgrade.module';

@Module({
  imports: [TravelAgentUpgradeModule],
  providers: [TravelAgentLicenseSchedulerService],
  exports: [TravelAgentLicenseSchedulerService],
})
export class SchedulersModule {}
