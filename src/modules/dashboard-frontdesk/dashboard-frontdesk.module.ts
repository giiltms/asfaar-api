import { Module } from '@nestjs/common';
import { DashboardFrontdeskController } from './dashboard-frontdesk.controller';
import { DashboardFrontdeskService } from './dashboard-frontdesk.service';
import { PrismaModule } from '@providers/prisma';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DashboardFrontdeskController],
  providers: [DashboardFrontdeskService],
  exports: [DashboardFrontdeskService],
})
export class DashboardFrontdeskModule {}
