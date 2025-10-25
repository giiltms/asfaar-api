import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TravelAgentLicenseService } from '../modules/travel-agent-upgrade/travel-agent-license.service';
import { TravelAgentLicenseNotificationsService } from '../notifications/travel-agent-license-notifications.service';

@Injectable()
export class TravelAgentLicenseSchedulerService {
  private readonly logger = new Logger(TravelAgentLicenseSchedulerService.name);

  constructor(
    private readonly licenseService: TravelAgentLicenseService,
    private readonly notificationService: TravelAgentLicenseNotificationsService,
  ) {}

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
      const result = await this.notificationService.sendExpirationNotifications(
        30,
      );

      if (result.sent > 0) {
        this.logger.log(
          `Sent ${result.sent} expiration notifications for licenses expiring in 30 days`,
        );
      } else if (result.failed > 0) {
        this.logger.warn(
          `Failed to send ${result.failed} expiration notifications for licenses expiring in 30 days`,
        );
      } else {
        this.logger.log('No licenses expiring in 30 days');
      }
    } catch (error) {
      this.logger.error(
        'Error sending expiration notifications for 30 days:',
        error,
      );
    }
  }

  /**
   * Check for licenses expiring in 7 days (daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkLicensesExpiringIn7Days() {
    this.logger.log('Checking for licenses expiring in 7 days...');

    try {
      const result = await this.notificationService.sendExpirationNotifications(
        7,
      );

      if (result.sent > 0) {
        this.logger.log(
          `Sent ${result.sent} urgent expiration notifications for licenses expiring in 7 days`,
        );
      } else if (result.failed > 0) {
        this.logger.warn(
          `Failed to send ${result.failed} urgent expiration notifications for licenses expiring in 7 days`,
        );
      } else {
        this.logger.log('No licenses expiring in 7 days');
      }
    } catch (error) {
      this.logger.error(
        'Error sending urgent expiration notifications for 7 days:',
        error,
      );
    }
  }

  /**
   * Check for licenses expiring in 1 day (daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  async checkLicensesExpiringIn1Day() {
    this.logger.log('Checking for licenses expiring in 1 day...');

    try {
      const result = await this.notificationService.sendExpirationNotifications(
        1,
      );

      if (result.sent > 0) {
        this.logger.log(
          `Sent ${result.sent} final warning notifications for licenses expiring in 1 day`,
        );
      } else if (result.failed > 0) {
        this.logger.warn(
          `Failed to send ${result.failed} final warning notifications for licenses expiring in 1 day`,
        );
      } else {
        this.logger.log('No licenses expiring in 1 day');
      }
    } catch (error) {
      this.logger.error(
        'Error sending final warning notifications for 1 day:',
        error,
      );
    }
  }
}
