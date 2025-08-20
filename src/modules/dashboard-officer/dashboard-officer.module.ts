import { Module } from '@nestjs/common';
import { DashboardOfficerController } from './dashboard-officer.controller';
import { DashboardOfficerService } from './dashboard-officer.service';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DashboardOfficerController],
  providers: [DashboardOfficerService],
  exports: [DashboardOfficerService],
})
export class DashboardOfficerModule {}
