import { Module } from '@nestjs/common';
import { TravelAgentLicenseSchedulerService } from './travel-agent-license-scheduler.service';
import { BiometricAppointmentReminderService } from './biometric-appointment-reminder.service';
import { TravelAgentUpgradeModule } from '../modules/travel-agent-upgrade/travel-agent-upgrade.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../modules/mail/mail.module';

@Module({
  imports: [TravelAgentUpgradeModule, NotificationsModule, MailModule],
  providers: [
    TravelAgentLicenseSchedulerService,
    BiometricAppointmentReminderService,
  ],
  exports: [
    TravelAgentLicenseSchedulerService,
    BiometricAppointmentReminderService,
  ],
})
export class SchedulersModule {}
