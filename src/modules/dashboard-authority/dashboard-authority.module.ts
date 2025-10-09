import { Module } from '@nestjs/common';
import { DashboardAuthorityController } from './dashboard-authority.controller';
import { DashboardAuthorityService } from './dashboard-authority.service';
import { PrismaModule } from '@providers/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardAuthorityController],
  providers: [DashboardAuthorityService],
  exports: [DashboardAuthorityService],
})
export class DashboardAuthorityModule {}
