import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UserDashboardController } from './user-dashboard.controller';
import { UserDashboardService } from './user-dashboard.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UserDashboardController],
  providers: [UserDashboardService],
  exports: [UserDashboardService],
})
export class UserDashboardModule {}
