import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TravelAgentLicenseService } from '../modules/travel-agent-upgrade/travel-agent-license.service';

@Injectable()
export class TravelAgentLicenseSchedulerService {
  private readonly logger = new Logger(TravelAgentLicenseSchedulerService.name);

  constructor(private readonly licenseService: TravelAgentLicenseService) {}

  /**
   * Process expired licenses daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processExpiredLicenses() {
    this.logger.log('Starting daily expired license processing...');

    try {
      const result = await this.licenseService.processExpiredLicenses();

      if (result.processed > 0) {
        this.logger.log(
          `Successfully processed ${result.processed
          } expired licenses: ${result.expired.join(', ')}`,
        );
      } else {
        this.logger.log('No expired licenses found to process');
      }
    } catch (error) {
      this.logger.error('Error processing expired licenses:', error);
    }
  }

  /**
   * Check for licenses expiring in 30 days (weekly on Monday)
   */
  @Cron('0 9 * * 1') // Every Monday at 9 AM
  async checkLicensesExpiringIn30Days() {
    this.logger.log('Checking for licenses expiring in 30 days...');

    try {
      const expiringLicenses =
        await this.licenseService.getLicensesExpiringSoon(30);

      if (expiringLicenses.length > 0) {
        this.logger.log(
          `Found ${expiringLicenses.length} licenses expiring in 30 days`,
        );

        // TODO: Send notifications to users
        // await this.sendExpirationNotifications(expiringLicenses, 30);
      } else {
        this.logger.log('No licenses expiring in 30 days');
      }
    } catch (error) {
      this.logger.error('Error checking licenses expiring in 30 days:', error);
    }
  }

  /**
   * Check for licenses expiring in 7 days (daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkLicensesExpiringIn7Days() {
    this.logger.log('Checking for licenses expiring in 7 days...');

    try {
      const expiringLicenses =
        await this.licenseService.getLicensesExpiringSoon(7);

      if (expiringLicenses.length > 0) {
        this.logger.log(
          `Found ${expiringLicenses.length} licenses expiring in 7 days`,
        );

        // TODO: Send urgent notifications to users
        // await this.sendExpirationNotifications(expiringLicenses, 7);
      } else {
        this.logger.log('No licenses expiring in 7 days');
      }
    } catch (error) {
      this.logger.error('Error checking licenses expiring in 7 days:', error);
    }
  }

  /**
   * Check for licenses expiring in 1 day (daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  async checkLicensesExpiringIn1Day() {
    this.logger.log('Checking for licenses expiring in 1 day...');

    try {
      const expiringLicenses =
        await this.licenseService.getLicensesExpiringSoon(1);

      if (expiringLicenses.length > 0) {
        this.logger.log(
          `Found ${expiringLicenses.length} licenses expiring in 1 day`,
        );

        // TODO: Send final warning notifications to users
        // await this.sendExpirationNotifications(expiringLicenses, 1);
      } else {
        this.logger.log('No licenses expiring in 1 day');
      }
    } catch (error) {
      this.logger.error('Error checking licenses expiring in 1 day:', error);
    }
  }

  /**
   * Send expiration notifications (placeholder for future implementation)
   */
  private async sendExpirationNotifications(
    licenses: any[],
    daysUntilExpiry: number,
  ): Promise<void> {
    // TODO: Implement notification service
    // This could include:
    // - Email notifications
    // - SMS notifications
    // - In-app notifications
    // - Push notifications

    this.logger.log(
      `Would send ${daysUntilExpiry}-day expiration notifications to ${licenses.length} users`,
    );

    for (const license of licenses) {
      this.logger.log(
        `Notification for license ${license.licenseNumber} (${license.user.email}) - expires in ${daysUntilExpiry} days`,
      );
    }
  }
}
