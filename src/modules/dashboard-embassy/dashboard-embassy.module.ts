import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { MailModule } from '@modules/mail/mail.module';
import { DashboardEmbassyController } from './dashboard-embassy.controller';
import { DashboardEmbassyService } from './dashboard-embassy.service';
import { DashboardVerificationService } from '@modules/dashboard-verification/dashboard-verification.service';

@Module({
  imports: [PrismaModule, AuthModule, MailModule],
  controllers: [DashboardEmbassyController],
  providers: [DashboardEmbassyService, DashboardVerificationService],
  exports: [DashboardEmbassyService],
})
export class DashboardEmbassyModule {}
