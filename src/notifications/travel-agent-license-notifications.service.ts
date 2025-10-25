import { Injectable, Logger } from '@nestjs/common';
import { TravelAgentLicenseService } from '../modules/travel-agent-upgrade/travel-agent-license.service';
import { MailService } from '../modules/mail/services/mail.service';

export interface LicenseExpirationNotification {
  licenseId: string;
  licenseNumber: string;
  userId: string;
  userEmail: string;
  userName: string;
  companyName: string;
  expiresAt: Date;
  daysUntilExpiry: number;
}

@Injectable()
export class TravelAgentLicenseNotificationsService {
  private readonly logger = new Logger(
    TravelAgentLicenseNotificationsService.name,
  );

  constructor(
    private readonly licenseService: TravelAgentLicenseService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Send expiration notifications for licenses expiring within specified days
   */
  async sendExpirationNotifications(days: number = 30): Promise<{
    sent: number;
    failed: number;
    notifications: LicenseExpirationNotification[];
  }> {
    this.logger.log(
      `Sending expiration notifications for licenses expiring in ${days} days...`,
    );

    try {
      const expiringLicenses =
        await this.licenseService.getLicensesExpiringSoon(days);

      if (expiringLicenses.length === 0) {
        this.logger.log('No licenses expiring soon, no notifications to send');
        return { sent: 0, failed: 0, notifications: [] };
      }

      const notifications: LicenseExpirationNotification[] = [];
      let sent = 0;
      let failed = 0;

      for (const license of expiringLicenses) {
        const notification = await this.createExpirationNotification(
          license,
          days,
        );
        notifications.push(notification);

        try {
          await this.sendNotification(notification);
          sent++;
          this.logger.log(
            `Sent expiration notification to ${notification.userEmail} for license ${notification.licenseNumber}`,
          );
        } catch (error) {
          failed++;
          this.logger.error(
            `Failed to send notification to ${notification.userEmail} for license ${notification.licenseNumber}:`,
            error,
          );
        }
      }

      this.logger.log(
        `Expiration notifications completed: ${sent} sent, ${failed} failed`,
      );

      return { sent, failed, notifications };
    } catch (error) {
      this.logger.error('Error sending expiration notifications:', error);
      throw error;
    }
  }

  /**
   * Send renewal reminder notifications
   */
  async sendRenewalReminders(): Promise<{
    sent: number;
    failed: number;
    reminders: LicenseExpirationNotification[];
  }> {
    this.logger.log('Sending renewal reminder notifications...');

    try {
      // Get licenses expiring in 30, 7, and 1 days
      const [expiring30Days, expiring7Days, expiring1Day] = await Promise.all([
        this.licenseService.getLicensesExpiringSoon(30),
        this.licenseService.getLicensesExpiringSoon(7),
        this.licenseService.getLicensesExpiringSoon(1),
      ]);

      const allExpiring = [
        ...expiring30Days,
        ...expiring7Days,
        ...expiring1Day,
      ];
      const uniqueLicenses = this.deduplicateLicenses(allExpiring);

      const reminders: LicenseExpirationNotification[] = [];
      let sent = 0;
      let failed = 0;

      for (const license of uniqueLicenses) {
        const daysUntilExpiry = this.calculateDaysUntilExpiry(
          license.expiresAt,
        );
        const notification = await this.createExpirationNotification(
          license,
          daysUntilExpiry,
        );

        reminders.push(notification);

        try {
          await this.sendNotification(notification);
          sent++;
          this.logger.log(
            `Sent renewal reminder to ${notification.userEmail} for license ${notification.licenseNumber} (${daysUntilExpiry} days remaining)`,
          );
        } catch (error) {
          failed++;
          this.logger.error(
            `Failed to send renewal reminder to ${notification.userEmail} for license ${notification.licenseNumber}:`,
            error,
          );
        }
      }

      this.logger.log(
        `Renewal reminders completed: ${sent} sent, ${failed} failed`,
      );

      return { sent, failed, reminders };
    } catch (error) {
      this.logger.error('Error sending renewal reminders:', error);
      throw error;
    }
  }

  /**
   * Create expiration notification object
   */
  private async createExpirationNotification(
    license: any,
    daysUntilExpiry: number,
  ): Promise<LicenseExpirationNotification> {
    return {
      licenseId: license.id,
      licenseNumber: license.licenseNumber,
      userId: license.user.id,
      userEmail: license.user.email,
      userName: `${license.user.firstName} ${license.user.lastName}`,
      companyName: license.application?.companyName || 'N/A',
      expiresAt: license.expiresAt,
      daysUntilExpiry,
    };
  }

  /**
   * Send individual notification via email
   */
  private async sendNotification(
    notification: LicenseExpirationNotification,
  ): Promise<void> {
    try {
      const { userEmail, userName, licenseNumber, companyName, daysUntilExpiry, expiresAt } = notification;

      // Determine email subject and urgency based on days until expiry
      let subject: string;
      let urgency: 'URGENT' | 'WARNING' | 'REMINDER';

      if (daysUntilExpiry === 1) {
        subject = `URGENT: Your Travel Agent License Expires Tomorrow - ${licenseNumber}`;
        urgency = 'URGENT';
      } else if (daysUntilExpiry <= 7) {
        subject = `WARNING: Your Travel Agent License Expires in ${daysUntilExpiry} Days - ${licenseNumber}`;
        urgency = 'WARNING';
      } else {
        subject = `REMINDER: Your Travel Agent License Expires in ${daysUntilExpiry} Days - ${licenseNumber}`;
        urgency = 'REMINDER';
      }

      // Format expiry date
      const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Send email using the existing mail service
      await this.mailService.sendLicenseExpirationNotification({
        userEmail,
        userName,
        licenseNumber,
        companyName,
        daysUntilExpiry,
        expiryDate,
        urgency,
        subject,
      });

      this.logger.log(
        `License expiration notification sent to ${userEmail} for license ${licenseNumber} (${daysUntilExpiry} days remaining)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send license expiration notification to ${notification.userEmail}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Build notification message
   */
  private buildNotificationMessage(
    notification: LicenseExpirationNotification,
  ): string {
    const { licenseNumber, userName, companyName, daysUntilExpiry } =
      notification;

    if (daysUntilExpiry === 1) {
      return `URGENT: License ${licenseNumber} for ${companyName} (${userName}) expires TOMORROW! Please renew immediately.`;
    } else if (daysUntilExpiry <= 7) {
      return `WARNING: License ${licenseNumber} for ${companyName} (${userName}) expires in ${daysUntilExpiry} days. Please renew soon.`;
    } else {
      return `REMINDER: License ${licenseNumber} for ${companyName} (${userName}) expires in ${daysUntilExpiry} days. Consider renewing.`;
    }
  }

  /**
   * Calculate days until expiry
   */
  private calculateDaysUntilExpiry(expiresAt: Date): number {
    const now = new Date();
    const expiryDate = new Date(expiresAt);
    return Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  /**
   * Remove duplicate licenses from array
   */
  private deduplicateLicenses(licenses: any[]): any[] {
    const seen = new Set();
    return licenses.filter((license) => {
      if (seen.has(license.id)) {
        return false;
      }
      seen.add(license.id);
      return true;
    });
  }

  /**
   * Get notification statistics
   */
  async getNotificationStatistics(): Promise<{
    totalNotifications: number;
    expiringIn30Days: number;
    expiringIn7Days: number;
    expiringIn1Day: number;
    overdue: number;
  }> {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(now.getDate() + 1);

    const [expiringIn30Days, expiringIn7Days, expiringIn1Day, overdue] =
      await Promise.all([
        this.licenseService.getLicensesExpiringSoon(30),
        this.licenseService.getLicensesExpiringSoon(7),
        this.licenseService.getLicensesExpiringSoon(1),
        this.licenseService.getLicensesExpiringSoon(0), // Overdue licenses
      ]);

    return {
      totalNotifications: expiringIn30Days.length,
      expiringIn30Days: expiringIn30Days.length,
      expiringIn7Days: expiringIn7Days.length,
      expiringIn1Day: expiringIn1Day.length,
      overdue: overdue.length,
    };
  }
}
