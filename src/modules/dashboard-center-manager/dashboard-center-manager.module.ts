import { Module } from '@nestjs/common';
import { DashboardCenterManagerService } from './dashboard-center-manager.service';
import { DashboardCenterManagerController } from './dashboard-center-manager.controller';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';

/**
 * DashboardCenterManagerModule
 *
 * Provides dashboard functionality for center managers
 * Includes station statistics, queue management, and performance metrics
 */
@Module({
  imports: [
    PrismaModule, // For database operations
    AuthModule, // For authentication guards
  ],
  controllers: [DashboardCenterManagerController],
  providers: [DashboardCenterManagerService],
  exports: [DashboardCenterManagerService], // Export service for use in other modules
})
export class DashboardCenterManagerModule {}
