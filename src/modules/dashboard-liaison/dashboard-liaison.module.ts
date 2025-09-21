import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { MailModule } from '@modules/mail/mail.module';
import { DashboardLiaisonController } from './dashboard-liaison.controller';
import { DashboardLiaisonService } from './dashboard-liaison.service';
import { DashboardVerificationService } from '@modules/dashboard-verification/dashboard-verification.service';

@Module({
  imports: [PrismaModule, AuthModule, MailModule],
  controllers: [DashboardLiaisonController],
  providers: [DashboardLiaisonService, DashboardVerificationService],
  exports: [DashboardLiaisonService],
})
export class DashboardLiaisonModule {}
