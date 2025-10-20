import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { TravelAgentUpgradeService } from './travel-agent-upgrade.service';
import { TravelAgentUpgradeController } from './travel-agent-upgrade.controller';
import { AdminTravelAgentUpgradeController } from './travel-agent-upgrade.admin.controller';

@Module({
  imports: [PrismaModule, AuthModule, PaymentsModule],
  controllers: [
    TravelAgentUpgradeController,
    AdminTravelAgentUpgradeController,
  ],
  providers: [TravelAgentUpgradeService],
  exports: [TravelAgentUpgradeService],
})
export class TravelAgentUpgradeModule {}
