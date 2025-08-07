import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { ApplicantDashboardController } from './applicant-dashboard.controller';
import { ApplicantDashboardService } from './applicant-dashboard.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ApplicantDashboardController],
  providers: [ApplicantDashboardService],
  exports: [ApplicantDashboardService],
})
export class ApplicantDashboardModule {} 