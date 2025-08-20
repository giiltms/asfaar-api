import { Module } from '@nestjs/common';
import { DashboardVerificationController } from './dashboard-verification.controller';
import { DashboardVerificationService } from './dashboard-verification.service';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DashboardVerificationController],
  providers: [DashboardVerificationService],
  exports: [DashboardVerificationService],
})
export class DashboardVerificationModule {}
