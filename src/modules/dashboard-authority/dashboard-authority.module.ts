import { Module } from '@nestjs/common';
import { DashboardAuthorityController } from './dashboard-authority.controller';
import { DashboardAuthorityService } from './dashboard-authority.service';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DashboardAuthorityController],
  providers: [DashboardAuthorityService],
  exports: [DashboardAuthorityService],
})
export class DashboardAuthorityModule {}
