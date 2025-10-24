import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { TravelAgentUpgradeModule } from '@modules/travel-agent-upgrade/travel-agent-upgrade.module';

/**
 * PaymentsModule
 *
 * Manages payment processing throughout the application
 * Provides services for payment lifecycle, status management, and refund processing
 */
@Module({
  imports: [
    PrismaModule, // For database operations
    AuthModule, // For authentication guards
    UserModule,
    TravelAgentUpgradeModule, // For travel agent upgrade webhook handling
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService], // Export service for use in other modules
})
export class PaymentsModule {}
