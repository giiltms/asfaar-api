import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';

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
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService], // Export service for use in other modules
})
export class PaymentsModule {}
