import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

export interface PaymentConfirmationData {
  userName: string;
  userEmail: string;
  referenceNumber: string;
  paymentReference: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  applicationId: string;
  paymentType?: string; // 'ONBOARDING', 'APPLICATION', 'UPGRADE', etc.
}

export interface EmbassySubmissionData {
  userName: string;
  userEmail: string;
  referenceNumber: string;
  embassyName: string;
  submissionDate: string;
}

export interface BiometricCaptureData {
  userName: string;
  userEmail: string;
  referenceNumber: string;
  centerName: string;
  captureDate: string;
}

export interface ApplicationQueryData {
  userName: string;
  userEmail: string;
  referenceNumber: string;
  queryMessage: string;
  requiredDocuments?: string[];
  queryDate: string;
  applicationUrl: string;
}

export interface ApplicationDecisionData {
  userName: string;
  userEmail: string;
  referenceNumber: string;
  embassyName: string;
  decision: 'APPROVED' | 'REJECTED';
  decisionDate: string;
  reason?: string;
}

export interface TravelAgentUpgradePaymentData {
  userEmail: string;
  userFullName: string;
  applicationId: string;
  applicationType: string;
  companyName: string;
  paymentAmount: number;
  paymentCurrency: string;
  paymentReference: string;
  paymentDate: string;
  reviewTimeline: string;
  supportEmail: string;
  platformName: string;
}

export interface TravelAgentUpgradeDecisionData {
  userEmail: string;
  userFullName: string;
  applicationId: string;
  applicationType: string;
  companyName: string;
  decision: 'APPROVED' | 'REJECTED';
  decisionDate: string;
  reason?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  supportEmail: string;
  platformName: string;
}

export interface LicenseExpirationNotificationData {
  userEmail: string;
  userName: string;
  licenseNumber: string;
  companyName: string;
  daysUntilExpiry: number;
  expiryDate: string;
  urgency: 'URGENT' | 'WARNING' | 'REMINDER';
  subject: string;
}

export interface LicenseIssuedNotificationData {
  userEmail: string;
  userName: string;
  licenseNumber: string;
  companyName: string;
  issuedDate: string;
  expiryDate: string;
  subject: string;
}

export interface LicenseSuspendedNotificationData {
  userEmail: string;
  userName: string;
  licenseNumber: string;
  companyName: string;
  suspendedDate: string;
  suspensionReason: string;
  suspendedBy: string;
  subject: string;
}

export interface LicenseRevokedNotificationData {
  userEmail: string;
  userName: string;
  licenseNumber: string;
  companyName: string;
  revokedDate: string;
  revocationReason: string;
  revokedBy: string;
  subject: string;
}

export interface LicenseReactivatedNotificationData {
  userEmail: string;
  userName: string;
  licenseNumber: string;
  companyName: string;
  reactivatedDate: string;
  reactivationReason: string;
  reactivatedBy: string;
  subject: string;
}

export interface ClientAddedNotificationData {
  userEmail: string;
  userName: string;
  agentName: string;
  companyName: string;
  addedDate: string;
  subject: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendRegisterationConfirmation(email: string, data: any): Promise<void> {
    const siteUrl = this.configService.get('SITE_URL', 'http://localhost:3000');
    const contactEmail = this.configService.get(
      'CONTACT_EMAIL',
      'contact@example.com',
    );

    await this.mailerService.sendMail({
      to: email,
      subject: 'Registration Confirmation',
      template: 'registeration-confirmation',
      context: {
        ...data,
        siteUrl,
        contactEmail,
      },
    });
  }

  async sendWelcomeEmail(email: string, data: any): Promise<void> {
    const siteUrl = this.configService.get('SITE_URL', 'http://localhost:3000');

    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome!',
      template: 'welcome-email',
      context: {
        ...data,
        siteUrl,
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const siteUrl = this.configService.get('SITE_URL', 'http://localhost:3000');

    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Request',
      template: 'request-reset-password',
      context: {
        resetToken,
        siteUrl,
        resetUrl: `${siteUrl}/reset-password?token=${resetToken}`,
      },
    });
  }

  async sendEmailVerification(
    email: string,
    userName: string,
    verificationToken: string,
  ): Promise<void> {
    try {
      // This is the link to the frontend
      const siteUrl = this.configService.get(
        'SITE_URL',
        'http://localhost:3000',
      );
      const verificationLink = `${siteUrl}/verification/verify-email?token=${verificationToken}`;

      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify Your Email Address - Asfaar Visa Services',
        template: 'email-verification',
        context: {
          userName,
          verificationLink,
        },
      });

      this.logger.debug(`Email verification sent successfully to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email verification to ${email}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendPaymentConfirmation(data: PaymentConfirmationData): Promise<void> {
    try {
      const dashboardUrl = this.configService.get(
        'SITE_URL',
        'http://localhost:3000',
      );
      const amountFormatted = `${data.currency} ${Number(
        data.amount,
      ).toLocaleString()}`;

      // Choose template based on payment type
      const isOnboarding = data.paymentType === 'ONBOARDING';
      const template = isOnboarding
        ? 'onboarding-payment-confirmation'
        : 'application-payment-confirmation';
      const subject = isOnboarding
        ? 'Onboarding Payment Confirmation - Asfaar Visa Services'
        : 'Application Payment Confirmation - Asfaar Visa Services';

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject,
        template,
        context: {
          userName: data.userName,
          referenceNumber: data.referenceNumber || 'N/A',
          paymentReference: data.paymentReference,
          transactionId: data.transactionId,
          amountFormatted,
          paymentDate: data.paymentDate,
          applicationId: data.applicationId,
          dashboardUrl,
        },
      });

      this.logger.log(
        `Payment confirmation email sent successfully to: ${data.userEmail} using template: ${template}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send payment confirmation email to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendEmbassySubmissionNotification(
    data: EmbassySubmissionData,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: 'Application Submitted to Embassy - Asfaar Visa Services',
        template: 'embassysubmission',
        context: {
          userName: data.userName,
          referenceNumber: data.referenceNumber,
          embassyName: data.embassyName,
          submissionDate: data.submissionDate,
        },
      });

      this.logger.log(
        `Embassy submission notification sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send embassy submission notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendBiometricCaptureNotification(
    data: BiometricCaptureData,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: 'Biometric Capture Completed - Asfaar Visa Services',
        template: 'biometriccapturing',
        context: {
          userName: data.userName,
          referenceNumber: data.referenceNumber,
          centerName: data.centerName,
          captureDate: data.captureDate,
        },
      });

      this.logger.log(
        `Biometric capture notification sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send biometric capture notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendApplicationQueryNotification(
    data: ApplicationQueryData,
  ): Promise<void> {
    try {
      const dashboardUrl = this.configService.get(
        'SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: 'Application Query - Action Required - Asfaar Visa Services',
        template: 'applicationquery',
        context: {
          userName: data.userName,
          referenceNumber: data.referenceNumber,
          queryMessage: data.queryMessage,
          requiredDocuments: data.requiredDocuments || [],
          queryDate: data.queryDate,
          applicationUrl: data.applicationUrl,
          dashboardUrl,
        },
      });

      this.logger.log(
        `Application query notification sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send application query notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendApplicationDecisionNotification(
    data: ApplicationDecisionData,
  ): Promise<void> {
    try {
      const subject =
        data.decision === 'APPROVED'
          ? 'Visa Application Approved - Asfaar Visa Services'
          : 'Visa Application Decision - Asfaar Visa Services';

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject,
        template: 'applicationdecision',
        context: {
          userName: data.userName,
          referenceNumber: data.referenceNumber,
          embassyName: data.embassyName,
          decision: data.decision,
          decisionDate: data.decisionDate,
          reason: data.reason,
        },
      });

      this.logger.log(
        `Application decision notification (${data.decision}) sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send application decision notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendTravelAgentUpgradePaymentConfirmation(
    data: TravelAgentUpgradePaymentData,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.userEmail,
        subject:
          'Travel Agent Upgrade Payment Received - Application Under Review',
        template: 'travel-agent-upgrade-payment-confirmation',
        context: {
          userFullName: data.userFullName,
          applicationId: data.applicationId,
          applicationType: data.applicationType,
          companyName: data.companyName,
          paymentAmount: data.paymentAmount,
          paymentCurrency: data.paymentCurrency,
          paymentReference: data.paymentReference,
          paymentDate: data.paymentDate,
          reviewTimeline: data.reviewTimeline,
          supportEmail: data.supportEmail,
          platformName: data.platformName,
        },
      });

      this.logger.log(
        `Travel agent upgrade payment confirmation email sent to ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send travel agent upgrade payment confirmation to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendTravelAgentUpgradeDecisionNotification(
    data: TravelAgentUpgradeDecisionData,
  ): Promise<void> {
    try {
      const subject =
        data.decision === 'APPROVED'
          ? 'Travel Agent Upgrade Application Approved - {{platformName}}'
          : 'Travel Agent Upgrade Application Decision - {{platformName}}';

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: subject.replace('{{platformName}}', data.platformName),
        template: 'travel-agent-upgrade-decision',
        context: {
          userFullName: data.userFullName,
          applicationId: data.applicationId,
          applicationType: data.applicationType,
          companyName: data.companyName,
          decision: data.decision,
          decisionDate: data.decisionDate,
          reason: data.reason,
          licenseNumber: data.licenseNumber,
          licenseExpiryDate: data.licenseExpiryDate,
          supportEmail: data.supportEmail,
          platformName: data.platformName,
        },
      });

      this.logger.log(
        `Travel agent upgrade decision notification (${data.decision}) sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send travel agent upgrade decision notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendLicenseExpirationNotification(
    data: LicenseExpirationNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'license-expiration-notification',
        context: {
          subject: data.subject,
          userName: data.userName,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          daysUntilExpiry: data.daysUntilExpiry,
          expiryDate: data.expiryDate,
          urgency: data.urgency,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `License expiration notification (${data.urgency}) sent successfully to: ${data.userEmail} for license ${data.licenseNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send license expiration notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendLicenseIssuedNotification(
    data: LicenseIssuedNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'license-issued-notification',
        context: {
          userName: data.userName,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          issuedDate: data.issuedDate,
          expiryDate: data.expiryDate,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `License issued notification sent successfully to: ${data.userEmail} for license ${data.licenseNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send license issued notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendLicenseSuspendedNotification(
    data: LicenseSuspendedNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'license-suspended-notification',
        context: {
          userName: data.userName,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          suspendedDate: data.suspendedDate,
          suspensionReason: data.suspensionReason,
          suspendedBy: data.suspendedBy,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `License suspended notification sent successfully to: ${data.userEmail} for license ${data.licenseNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send license suspended notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendLicenseRevokedNotification(
    data: LicenseRevokedNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'license-revoked-notification',
        context: {
          userName: data.userName,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          revokedDate: data.revokedDate,
          revocationReason: data.revocationReason,
          revokedBy: data.revokedBy,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `License revoked notification sent successfully to: ${data.userEmail} for license ${data.licenseNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send license revoked notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendLicenseReactivatedNotification(
    data: LicenseReactivatedNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'license-reactivated-notification',
        context: {
          userName: data.userName,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          reactivatedDate: data.reactivatedDate,
          reactivationReason: data.reactivationReason,
          reactivatedBy: data.reactivatedBy,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `License reactivated notification sent successfully to: ${data.userEmail} for license ${data.licenseNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send license reactivated notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendClientAddedNotification(
    data: ClientAddedNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'client-added-notification',
        context: {
          subject: data.subject,
          userName: data.userName,
          companyName: data.companyName,
          addedDate: data.addedDate,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `Client added notification sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send client added notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }
}
